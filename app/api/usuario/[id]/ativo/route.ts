import { createClient as createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { temPermissao } from '@/lib/permissoes/definicoes'
import { NextRequest, NextResponse } from 'next/server'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role, permissoes').eq('id', user.id).single()
  const permissoes = (profile?.permissoes ?? {}) as Record<string, boolean>
  if (!profile || !['admin', 'recepcao'].includes(profile.role) || !temPermissao(profile.role, permissoes, 'gerenciar_usuarios')) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  // Bloqueia auto-banimento
  if (id === user.id) {
    return NextResponse.json({ error: 'Não é possível alterar o próprio status' }, { status: 400 })
  }

  const { ativo } = await request.json()
  if (typeof ativo !== 'boolean') {
    return NextResponse.json({ error: 'Campo ativo deve ser boolean' }, { status: 400 })
  }

  // Recepção só pode toggle pais (não pode banir admin, recepção, ou terapeuta)
  if (profile?.role === 'recepcao') {
    const { data: alvo } = await supabase.from('profiles').select('role').eq('id', id).single()
    if (!alvo) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    if (alvo.role !== 'pai') {
      return NextResponse.json({ error: 'Recepção só pode alterar status de responsáveis' }, { status: 403 })
    }
  }

  const adminClient = createAdminClient()

  // Atualiza flag na tabela profiles
  await adminClient.from('profiles').update({ ativo }).eq('id', id)

  // Bane ou desbane no Supabase Auth para bloquear login
  await adminClient.auth.admin.updateUserById(id, {
    ban_duration: ativo ? 'none' : '876600h',
  })

  return NextResponse.json({ success: true })
}
