import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!['admin', 'recepcao'].includes(profile?.role ?? '')) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const { ativo } = await request.json()
  if (typeof ativo !== 'boolean') {
    return NextResponse.json({ error: 'Campo ativo deve ser boolean' }, { status: 400 })
  }

  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Atualiza flag na tabela profiles
  await adminClient.from('profiles').update({ ativo }).eq('id', id)

  // Bane ou desbane no Supabase Auth para bloquear login
  await adminClient.auth.admin.updateUserById(id, {
    ban_duration: ativo ? 'none' : '876600h',
  })

  return NextResponse.json({ success: true })
}
