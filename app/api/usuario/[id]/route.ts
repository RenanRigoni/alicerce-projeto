import { createClient as createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Apenas admin pode deletar usuários' }, { status: 403 })
  }

  // Impede que o admin delete a si mesmo
  if (id === user.id) {
    return NextResponse.json({ error: 'Não é possível deletar sua própria conta' }, { status: 400 })
  }

  const adminClient = createAdminClient()

  // Deletar de auth.users cascateia para profiles automaticamente
  const { error } = await adminClient.auth.admin.deleteUser(id)
  if (error) {
    return NextResponse.json({ error: 'Erro ao deletar usuário' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
