import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { gerarHash } from '@/lib/hash/gerar-hash'

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
    .select('terapeuta_id, paciente_id, assinado_em')
    .eq('id', id)
    .single()

  if (!ori) return NextResponse.json({ error: 'Orientação não encontrada' }, { status: 404 })
  if (ori.terapeuta_id !== user.id) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const { titulo, tipo, url_midia, conteudo } = await request.json()
  if (!titulo?.trim()) return NextResponse.json({ error: 'Título é obrigatório.' }, { status: 400 })

  const tiposValidos = ['texto', 'video', 'pdf', 'imagem', 'guia']
  const tipoFinal = tiposValidos.includes(tipo) ? tipo : 'texto'

  const hash = await gerarHash({
    paciente_id: ori.paciente_id,
    terapeuta_id: user.id,
    titulo: titulo.trim(),
    tipo: tipoFinal,
    conteudo: conteudo?.trim() ?? null,
    url_midia: url_midia?.trim() ?? null,
    assinado_em: ori.assinado_em,
  })

  const { error } = await supabase.from('orientacoes').update({
    titulo: titulo.trim(),
    tipo: tipoFinal,
    url_midia: url_midia?.trim() || null,
    conteudo: conteudo?.trim() || null,
    hash_integridade: hash,
  }).eq('id', id)

  if (error) return NextResponse.json({ error: 'Erro ao atualizar orientação.' }, { status: 500 })

  return NextResponse.json({ success: true })
}

export async function DELETE() {
  // COFFITO Res. 424/2013: registros clínicos são imutáveis após criação.
  return NextResponse.json(
    { error: 'Orientações não podem ser excluídas após criação. O prontuário é imutável (COFFITO Res. 424/2013).' },
    { status: 409 }
  )
}
