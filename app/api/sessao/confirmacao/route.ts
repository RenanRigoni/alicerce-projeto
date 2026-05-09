import { createClient as createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!['admin', 'recepcao', 'terapeuta'].includes(profile?.role ?? '')) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Body inválido' }, { status: 400 })

  const { paciente_id, data_hora } = body
  if (!paciente_id || !data_hora) {
    return NextResponse.json({ error: 'paciente_id e data_hora são obrigatórios' }, { status: 400 })
  }

  const dataHoraDate = new Date(data_hora)
  const agora = new Date()

  if (dataHoraDate <= agora) {
    return NextResponse.json({ error: 'Sessão já ocorreu.' }, { status: 400 })
  }

  const expiraEm = new Date(dataHoraDate.getTime() - 24 * 60 * 60 * 1000)
  if (expiraEm <= agora) {
    return NextResponse.json({ error: 'Sessão acontece em menos de 24h. Prazo encerrado.' }, { status: 400 })
  }

  const adminClient = createAdminClient()
  const dataHoraISO = dataHoraDate.toISOString()

  const { data: existing } = await adminClient
    .from('sessao_confirmacoes')
    .select('token, status')
    .eq('paciente_id', paciente_id)
    .eq('data_hora', dataHoraISO)
    .maybeSingle()

  let token: string
  let currentStatus: string

  if (existing && (existing.status === 'pendente' || existing.status === 'confirmada')) {
    token = existing.token
    currentStatus = existing.status
  } else {
    if (existing) {
      await adminClient
        .from('sessao_confirmacoes')
        .delete()
        .eq('paciente_id', paciente_id)
        .eq('data_hora', dataHoraISO)
    }

    const { data: nova, error } = await adminClient
      .from('sessao_confirmacoes')
      .insert({
        paciente_id,
        terapeuta_id: user.id,
        data_hora: dataHoraISO,
        expira_em: expiraEm.toISOString(),
        status: 'pendente',
      })
      .select('token')
      .single()

    if (error || !nova) {
      return NextResponse.json({ error: 'Erro ao criar confirmação.' }, { status: 500 })
    }

    token = nova.token
    currentStatus = 'pendente'
  }

  // Busca telefone do responsável principal
  const { data: vinculo } = await adminClient
    .from('paciente_responsaveis')
    .select('responsavel_id')
    .eq('paciente_id', paciente_id)
    .eq('tipo', 'principal')
    .maybeSingle()

  let telefone: string | null = null
  if (vinculo?.responsavel_id) {
    const { data: detalhes } = await adminClient
      .from('responsaveis_detalhes')
      .select('telefone_principal')
      .eq('id', vinculo.responsavel_id)
      .maybeSingle()
    telefone = detalhes?.telefone_principal ?? null
  }

  // Busca nome do paciente
  const { data: paciente } = await adminClient
    .from('pacientes')
    .select('nome')
    .eq('id', paciente_id)
    .single()

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? request.nextUrl.origin
  const confirmarUrl = `${baseUrl}/s/confirmar/${token}`
  const cancelarUrl = `${baseUrl}/s/cancelar/${token}`

  const dataFormatada = dataHoraDate.toLocaleDateString('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'long',
    timeZone: 'America/Sao_Paulo',
  })
  const horaFormatada = dataHoraDate.toLocaleTimeString('pt-BR', {
    hour: '2-digit', minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  })

  const nomePaciente = paciente?.nome ?? 'seu filho(a)'
  const msg =
    `Olá! Seguem os detalhes da sessão de *${nomePaciente}*:\n\n` +
    `📅 ${dataFormatada} às ${horaFormatada}\n\n` +
    `Por favor, confirme ou cancele até 24h antes:\n\n` +
    `✅ *Confirmar presença:*\n${confirmarUrl}\n\n` +
    `❌ *Cancelar sessão:*\n${cancelarUrl}\n\n` +
    `⚠️ _Sem resposta até o prazo, a sessão será confirmada automaticamente e cobrada normalmente._`

  // Formato: 55 + DDD + número (strip tudo não-numérico)
  const telStripped = telefone ? telefone.replace(/\D/g, '') : null
  const waUrl = telStripped
    ? `https://wa.me/55${telStripped}?text=${encodeURIComponent(msg)}`
    : `https://wa.me/?text=${encodeURIComponent(msg)}`

  return NextResponse.json({ waUrl, token, status: currentStatus })
}
