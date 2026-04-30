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

export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'terapeuta') {
    return NextResponse.json({ error: 'Apenas terapeutas podem confirmar alta' }, { status: 403 })
  }

  const admin = adminClient()

  const { data: solicitacao } = await admin
    .from('solicitacoes_alta')
    .select('paciente_id, status, tipo, motivo')
    .eq('id', id)
    .single()

  if (!solicitacao) return NextResponse.json({ error: 'Solicitação não encontrada' }, { status: 404 })
  if (solicitacao.status !== 'pendente_confirmacao') {
    return NextResponse.json({ error: 'Solicitação não está aguardando confirmação' }, { status: 409 })
  }

  // Terapeuta deve estar vinculado ao paciente
  const { data: vinculo } = await supabase
    .from('paciente_terapeutas')
    .select('terapeuta_id')
    .eq('paciente_id', solicitacao.paciente_id)
    .eq('terapeuta_id', user.id)
    .maybeSingle()

  if (!vinculo) {
    return NextResponse.json({ error: 'Sem vínculo com este paciente' }, { status: 403 })
  }

  const agora = new Date().toISOString()
  const hash = await gerarHash({
    solicitacao_id: id,
    paciente_id: solicitacao.paciente_id,
    confirmado_por: user.id,
    confirmado_em: agora,
  })

  const { error: errUpdate } = await admin.from('solicitacoes_alta').update({
    status: 'confirmada',
    confirmado_por: user.id,
    confirmado_em: agora,
    hash_integridade: hash,
  }).eq('id', id)

  if (errUpdate) return NextResponse.json({ error: 'Erro ao confirmar alta' }, { status: 500 })

  // Desativa o paciente
  await admin.from('pacientes').update({ status: 'alta' }).eq('id', solicitacao.paciente_id)

  // Apaga agendamentos futuros
  await admin
    .from('agendamentos')
    .delete()
    .eq('paciente_id', solicitacao.paciente_id)
    .gt('data_hora', agora)

  const { data: paciente } = await admin
    .from('pacientes')
    .select('nome')
    .eq('id', solicitacao.paciente_id)
    .single()

  // Notifica responsáveis
  await notificarResponsaveisDoPaciente(
    solicitacao.paciente_id,
    'alta_confirmada',
    `Alta confirmada — ${paciente?.nome ?? 'Paciente'}`,
    'A solicitação de alta foi confirmada pela terapeuta.',
    `/portal/paciente/${solicitacao.paciente_id}`
  )

  return NextResponse.json({ success: true })
}
