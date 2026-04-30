import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { gerarHash } from '@/lib/hash/gerar-hash'
import { notificarResponsaveisDoPaciente } from '@/lib/notificacoes/inserir'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function POST(request: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'terapeuta') {
    return NextResponse.json({ error: 'Apenas terapeutas podem registrar alta' }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  const { paciente_id, motivo } = body
  if (!paciente_id || !motivo?.trim()) {
    return NextResponse.json({ error: 'Paciente e motivo são obrigatórios' }, { status: 400 })
  }

  // Terapeuta deve estar vinculado ao paciente
  const { data: vinculo } = await supabase
    .from('paciente_terapeutas')
    .select('terapeuta_id')
    .eq('paciente_id', paciente_id)
    .eq('terapeuta_id', user.id)
    .maybeSingle()

  if (!vinculo) {
    return NextResponse.json({ error: 'Sem vínculo com este paciente' }, { status: 403 })
  }

  // Paciente deve estar ativo
  const { data: paciente } = await supabase
    .from('pacientes')
    .select('nome, status')
    .eq('id', paciente_id)
    .single()

  if (!paciente) return NextResponse.json({ error: 'Paciente não encontrado' }, { status: 404 })
  if (paciente.status !== 'ativo') {
    return NextResponse.json({ error: 'Paciente já está inativo' }, { status: 409 })
  }

  const agora = new Date().toISOString()
  const hash = await gerarHash({
    paciente_id,
    terapeuta_id: user.id,
    tipo: 'terapeuta',
    motivo: motivo.trim(),
    registrado_em: agora,
  })

  const { error: insertError } = await supabase.from('solicitacoes_alta').insert({
    paciente_id,
    solicitado_por: user.id,
    tipo: 'terapeuta',
    status: 'registrada',
    motivo: motivo.trim(),
    hash_integridade: hash,
  })

  if (insertError) return NextResponse.json({ error: 'Erro ao registrar alta' }, { status: 500 })

  const admin = adminClient()

  // Desativa o paciente
  await admin.from('pacientes').update({ status: 'alta' }).eq('id', paciente_id)

  // Apaga agendamentos futuros
  await admin
    .from('agendamentos')
    .delete()
    .eq('paciente_id', paciente_id)
    .gt('data_hora', agora)

  // Notifica responsáveis
  await notificarResponsaveisDoPaciente(
    paciente_id,
    'alta_registrada',
    `Alta registrada — ${paciente.nome}`,
    motivo.trim().slice(0, 120),
    `/portal/paciente/${paciente_id}`
  )

  return NextResponse.json({ success: true })
}
