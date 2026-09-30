import { createClient as createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

// Chamada pelo cliente depois de um updateUser({ password }) bem-sucedido.
// Grava com service role, mas só no perfil do próprio usuário da sessão.
export async function POST() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { error } = await createAdminClient()
    .from('profiles')
    .update({ senha_definida_em: new Date().toISOString() })
    .eq('id', user.id)

  if (error) {
    return NextResponse.json({ error: 'Erro ao registrar a troca de senha.' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
