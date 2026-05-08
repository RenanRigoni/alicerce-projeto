import { createClient as createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!['admin', 'recepcao'].includes(profile?.role ?? '')) {
    return NextResponse.json({ error: 'Sem permissão para excluir pacientes' }, { status: 403 })
  }

  const adminClient = createAdminClient()

  // LGPD + COFFITO: qualquer registro clínico implica guarda obrigatória de 20 anos.
  // Bloqueia exclusão física se existir QUALQUER dado clínico do paciente.
  const [
    { count: totalRelatorios },
    { count: totalDocumentos },
    { count: totalOrientacoes },
    { count: totalDadosClinicos },
    { count: totalAltas },
  ] = await Promise.all([
    adminClient.from('relatorios').select('id', { count: 'exact', head: true }).eq('paciente_id', id),
    adminClient.from('documentos').select('id', { count: 'exact', head: true }).eq('paciente_id', id),
    adminClient.from('orientacoes').select('id', { count: 'exact', head: true }).eq('paciente_id', id),
    adminClient.from('pacientes_dados_clinicos').select('paciente_id', { count: 'exact', head: true }).eq('paciente_id', id),
    adminClient.from('solicitacoes_alta').select('id', { count: 'exact', head: true }).eq('paciente_id', id),
  ])

  const temProntuario =
    (totalRelatorios ?? 0) > 0 ||
    (totalDocumentos ?? 0) > 0 ||
    (totalOrientacoes ?? 0) > 0 ||
    (totalDadosClinicos ?? 0) > 0 ||
    (totalAltas ?? 0) > 0

  if (temProntuario) {
    return NextResponse.json(
      { error: 'Este paciente possui prontuário clínico registrado. A exclusão permanente é vedada pela LGPD e pelo COFFITO (guarda obrigatória de 20 anos). Use a opção de desativar o cadastro.' },
      { status: 409 }
    )
  }

  // Paciente sem nenhum dado clínico: remove vínculos e cadastro
  await adminClient.from('paciente_terapeutas').delete().eq('paciente_id', id)
  await adminClient.from('paciente_responsaveis').delete().eq('paciente_id', id)

  const { error } = await adminClient.from('pacientes').delete().eq('id', id)

  if (error) {
    return NextResponse.json({ error: 'Erro ao excluir paciente.' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
