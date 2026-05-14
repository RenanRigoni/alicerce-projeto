import { createClient as createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { gerarHash } from '@/lib/hash/gerar-hash'
import { notificarResponsaveisDoPaciente } from '@/lib/notificacoes/inserir'
import { temPermissao } from '@/lib/permissoes/definicoes'

export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role, permissoes').eq('id', user.id).single()
  if (profile?.role !== 'terapeuta') {
    return NextResponse.json({ error: 'Apenas profissionais podem confirmar alta' }, { status: 403 })
  }
  if (!temPermissao(profile.role, (profile.permissoes ?? {}) as Record<string, boolean>, 'registrar_alta')) {
    return NextResponse.json({ error: 'Sem permissÃ£o para confirmar alta' }, { status: 403 })
  }

  const admin = createAdminClient()

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

  // UPDATE atômico — só confirma se ainda estiver pendente (evita dupla confirmação)
  const { data: rowsConfirmadas, error: errUpdate } = await admin
    .from('solicitacoes_alta')
    .update({
      status: 'confirmada',
      confirmado_por: user.id,
      confirmado_em: agora,
      hash_integridade: hash,
    })
    .eq('id', id)
    .eq('status', 'pendente_confirmacao')
    .select('id')

  if (errUpdate) return NextResponse.json({ error: 'Erro ao confirmar alta' }, { status: 500 })
  if (!rowsConfirmadas?.length) {
    return NextResponse.json({ error: 'Solicitação já foi processada por outra requisição' }, { status: 409 })
  }

  // Desativa o paciente
  await admin.from('pacientes').update({ status: 'alta' }).eq('id', solicitacao.paciente_id)

  // Apaga agendamentos futuros
  await admin
    .from('agendamentos')
    .delete()
    .eq('paciente_id', solicitacao.paciente_id)
    .gt('data_hora', agora)

  // Notifica responsáveis
  await notificarResponsaveisDoPaciente(
    solicitacao.paciente_id,
    'alta_confirmada',
    'Alta confirmada',
    'A solicitação de alta foi confirmada pela profissional.',
    `/portal/paciente/${solicitacao.paciente_id}`
  )

  return NextResponse.json({ success: true })
}
