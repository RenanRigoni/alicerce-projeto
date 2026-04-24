import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { inserirNotificacao } from '@/lib/notificacoes/inserir'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Apenas admin pode decidir sobre alta' }, { status: 403 })
  }

  const { decisao, argumentacao_recusa } = await request.json()
  if (!['aprovada', 'recusada'].includes(decisao)) {
    return NextResponse.json({ error: 'Decisão inválida' }, { status: 400 })
  }
  if (decisao === 'recusada' && !argumentacao_recusa?.trim()) {
    return NextResponse.json({ error: 'Argumentação obrigatória ao recusar' }, { status: 400 })
  }

  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data: solicitacao } = await adminClient
    .from('solicitacoes_alta')
    .select('paciente_id, status, solicitado_por')
    .eq('id', id)
    .single()

  if (!solicitacao) return NextResponse.json({ error: 'Solicitação não encontrada' }, { status: 404 })
  if (solicitacao.status !== 'pendente') {
    return NextResponse.json({ error: 'Solicitação já foi decidida' }, { status: 409 })
  }

  await adminClient.from('solicitacoes_alta').update({
    status: decisao,
    argumentacao_recusa: decisao === 'recusada' ? argumentacao_recusa.trim() : null,
    decidido_por: user.id,
    decidido_em: new Date().toISOString(),
  }).eq('id', id)

  if (decisao === 'aprovada') {
    await adminClient
      .from('pacientes')
      .update({ status: 'alta' })
      .eq('id', solicitacao.paciente_id)
  }

  if (decisao === 'recusada' && solicitacao.solicitado_por) {
    const { data: paciente } = await adminClient
      .from('pacientes')
      .select('nome')
      .eq('id', solicitacao.paciente_id)
      .single()

    await inserirNotificacao({
      destinatario_id: solicitacao.solicitado_por,
      tipo: 'alta_recusada',
      titulo: `Alta recusada — ${paciente?.nome ?? 'Paciente'}`,
      mensagem: argumentacao_recusa?.trim().slice(0, 160),
      link: `/terapia/paciente/${solicitacao.paciente_id}`,
    })
  }

  return NextResponse.json({ success: true })
}
