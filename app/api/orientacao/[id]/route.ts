import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { data: ori } = await supabase
    .from('orientacoes')
    .select('terapeuta_id')
    .eq('id', id)
    .single()

  if (!ori) return NextResponse.json({ error: 'Orientação não encontrada' }, { status: 404 })
  if (ori.terapeuta_id !== user.id) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const { titulo, tipo, url_midia, conteudo } = await request.json()
  if (!titulo?.trim()) return NextResponse.json({ error: 'Título é obrigatório.' }, { status: 400 })

  const tiposValidos = ['texto', 'video', 'pdf', 'imagem', 'guia']
  const { error } = await supabase.from('orientacoes').update({
    titulo: titulo.trim(),
    tipo: tiposValidos.includes(tipo) ? tipo : 'texto',
    url_midia: url_midia?.trim() || null,
    conteudo: conteudo?.trim() || null,
  }).eq('id', id)

  if (error) return NextResponse.json({ error: 'Erro ao atualizar orientação.' }, { status: 500 })

  return NextResponse.json({ success: true })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { data: ori } = await supabase
    .from('orientacoes')
    .select('terapeuta_id')
    .eq('id', id)
    .single()

  if (!ori) return NextResponse.json({ error: 'Orientação não encontrada' }, { status: 404 })
  if (ori.terapeuta_id !== user.id) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const { error } = await supabase.from('orientacoes').delete().eq('id', id)
  if (error) return NextResponse.json({ error: 'Erro ao excluir orientação.' }, { status: 500 })

  return NextResponse.json({ success: true })
}
