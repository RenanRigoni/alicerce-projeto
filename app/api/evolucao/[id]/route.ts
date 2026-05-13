import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'terapeuta') {
    return NextResponse.json({ error: 'Apenas profissionais podem editar evolucoes' }, { status: 403 })
  }

  const { data: evolucao } = await supabase
    .from('evolucoes')
    .select('id, terapeuta_id, status')
    .eq('id', id)
    .single()

  if (!evolucao) return NextResponse.json({ error: 'Evolucao nao encontrada' }, { status: 404 })
  if (evolucao.terapeuta_id !== user.id) {
    return NextResponse.json({ error: 'Sem permissao para editar esta evolucao' }, { status: 403 })
  }
  if (evolucao.status === 'publicado') {
    return NextResponse.json({ error: 'Evolucoes publicadas nao podem ser editadas' }, { status: 409 })
  }

  const body = await request.json()
  const { identificacao, conclusao, obs_clinicas, pdf_url } = body

  const { error } = await supabase
    .from('evolucoes')
    .update({
      ...(identificacao !== undefined ? { identificacao } : {}),
      conclusao: conclusao ?? null,
      obs_clinicas: obs_clinicas ?? null,
      ...(pdf_url !== undefined ? { pdf_url } : {}),
    })
    .eq('id', id)

  if (error) return NextResponse.json({ error: 'Erro ao atualizar evolucao' }, { status: 500 })
  return NextResponse.json({ success: true })
}
