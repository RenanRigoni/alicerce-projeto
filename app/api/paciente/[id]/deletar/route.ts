import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
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

  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Remove registros relacionados em ordem para respeitar FKs
  await adminClient.from('pacientes_dados_clinicos').delete().eq('paciente_id', id)
  await adminClient.from('paciente_terapeutas').delete().eq('paciente_id', id)
  await adminClient.from('paciente_responsaveis').delete().eq('paciente_id', id)
  await adminClient.from('solicitacoes_alta').delete().eq('paciente_id', id)
  await adminClient.from('orientacoes').delete().eq('paciente_id', id)
  await adminClient.from('documentos').delete().eq('paciente_id', id)
  await adminClient.from('relatorios').delete().eq('paciente_id', id)

  const { error } = await adminClient.from('pacientes').delete().eq('id', id)

  if (error) {
    return NextResponse.json({ error: 'Erro ao excluir paciente.' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
