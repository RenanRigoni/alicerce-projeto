import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { gerarHash } from '@/lib/hash/gerar-hash'
import { notificarTerapeutasDoPaciente } from '@/lib/notificacoes/inserir'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'pai') {
    return NextResponse.json({ error: 'Apenas responsáveis podem solicitar alta por este canal' }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  const { paciente_id, motivo, documento_url } = body
  if (!paciente_id || !motivo?.trim()) {
    return NextResponse.json({ error: 'Paciente e motivo são obrigatórios' }, { status: 400 })
  }

  // Responsável deve estar vinculado ao paciente
  const { data: vinculo } = await supabase
    .from('paciente_responsaveis')
    .select('responsavel_id')
    .eq('paciente_id', paciente_id)
    .eq('responsavel_id', user.id)
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

  // Sem alta pendente de confirmação
  const { data: existente } = await supabase
    .from('solicitacoes_alta')
    .select('id')
    .eq('paciente_id', paciente_id)
    .eq('status', 'pendente_confirmacao')
    .maybeSingle()

  if (existente) {
    return NextResponse.json({ error: 'Já existe uma solicitação de alta aguardando confirmação' }, { status: 409 })
  }

  const agora = new Date().toISOString()
  const hash = await gerarHash({
    paciente_id,
    responsavel_id: user.id,
    tipo: 'responsavel',
    motivo: motivo.trim(),
    documento_url: documento_url ?? null,
    solicitado_em: agora,
  })

  const { error } = await supabase.from('solicitacoes_alta').insert({
    paciente_id,
    solicitado_por: user.id,
    tipo: 'responsavel',
    status: 'pendente_confirmacao',
    motivo: motivo.trim(),
    documento_url: documento_url ?? null,
    hash_integridade: hash,
  })

  if (error) return NextResponse.json({ error: 'Erro ao registrar solicitação' }, { status: 500 })

  await notificarTerapeutasDoPaciente(
    paciente_id,
    'alta_solicitada_responsavel',
    'Solicitação de alta recebida',
    motivo.trim().slice(0, 120),
    `/terapia/paciente/${paciente_id}`
  )

  return NextResponse.json({ success: true })
}
