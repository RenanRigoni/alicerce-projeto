import { createClient as createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { gerarHash } from '@/lib/hash/gerar-hash'
import { notificarResponsaveisDoPaciente } from '@/lib/notificacoes/inserir'
import { temPermissao } from '@/lib/permissoes/definicoes'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role, permissoes').eq('id', user.id).single()
  if (profile?.role !== 'terapeuta') {
    return NextResponse.json({ error: 'Apenas profissionais podem recusar alta' }, { status: 403 })
  }
  if (!temPermissao(profile.role, (profile.permissoes ?? {}) as Record<string, boolean>, 'registrar_alta')) {
    return NextResponse.json({ error: 'Sem permissÃ£o para recusar alta' }, { status: 403 })
  }

  const body = await request.json().catch(() => ({}))
  const argumentacao = body.argumentacao_recusa ?? ''

  const admin = createAdminClient()

  const { data: solicitacao } = await admin
    .from('solicitacoes_alta')
    .select('paciente_id, status, tipo')
    .eq('id', id)
    .single()

  if (!solicitacao) return NextResponse.json({ error: 'Solicitação não encontrada' }, { status: 404 })
  if (solicitacao.status !== 'pendente_confirmacao') {
    return NextResponse.json({ error: 'Solicitação não está aguardando confirmação' }, { status: 409 })
  }

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
    recusado_por: user.id,
    recusado_em: agora,
  })

  await admin.from('solicitacoes_alta').update({
    status: 'recusada',
    argumentacao_recusa: argumentacao,
    hash_integridade: hash,
  }).eq('id', id)

  await notificarResponsaveisDoPaciente(
    solicitacao.paciente_id,
    'alta_recusada',
    'Solicitação de alta recusada',
    argumentacao
      ? `A profissional recusou a solicitação de alta. Justificativa: ${argumentacao}`
      : 'A profissional recusou a solicitação de alta.',
    `/portal/paciente/${solicitacao.paciente_id}`
  )

  return NextResponse.json({ success: true })
}
