import { createClient as createServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { temPermissao } from '@/lib/permissoes/definicoes'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role, permissoes').eq('id', user.id).single()
  if (!profile || !temPermissao(profile.role, (profile.permissoes ?? {}) as Record<string, boolean>, 'criar_comunicados')) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const { titulo, conteudo } = await request.json()
  if (!titulo?.trim() || !conteudo?.trim()) {
    return NextResponse.json({ error: 'Título e conteúdo são obrigatórios.' }, { status: 400 })
  }

  const { error } = await supabase
    .from('comunicados')
    .update({ titulo: titulo.trim(), conteudo: conteudo.trim() })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role, permissoes').eq('id', user.id).single()
  if (!profile || !temPermissao(profile.role, (profile.permissoes ?? {}) as Record<string, boolean>, 'criar_comunicados')) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const { error } = await supabase.from('comunicados').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
