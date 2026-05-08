import { createClient as createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!['admin', 'recepcao'].includes(profile?.role ?? '')) {
    return NextResponse.json({ error: 'Apenas admin ou recepção pode alterar status do paciente' }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  const { status, motivo_desativacao } = body
  if (!['ativo', 'desativado'].includes(status)) {
    return NextResponse.json({ error: 'Status inválido' }, { status: 400 })
  }

  const adminClient = createAdminClient()

  const updateData: Record<string, string | null> = { status }
  if (status === 'desativado') {
    updateData.motivo_desativacao = motivo_desativacao?.trim() || null
  } else {
    updateData.motivo_desativacao = null
  }

  const { error } = await adminClient.from('pacientes').update(updateData).eq('id', id)
  if (error) return NextResponse.json({ error: 'Erro ao atualizar status.' }, { status: 500 })
  return NextResponse.json({ success: true })
}
