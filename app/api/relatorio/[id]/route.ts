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

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'terapeuta') {
    return NextResponse.json({ error: 'Apenas terapeutas podem editar relatórios' }, { status: 403 })
  }

  const { data: relatorio } = await supabase
    .from('relatorios')
    .select('id, terapeuta_id, status')
    .eq('id', id)
    .single()

  if (!relatorio) return NextResponse.json({ error: 'Relatório não encontrado' }, { status: 404 })
  if (relatorio.terapeuta_id !== user.id) {
    return NextResponse.json({ error: 'Sem permissão para editar este relatório' }, { status: 403 })
  }
  if (relatorio.status === 'publicado') {
    return NextResponse.json({ error: 'Relatórios publicados não podem ser editados' }, { status: 409 })
  }

  const body = await request.json()
  const { identificacao, conclusao, obs_clinicas, pdf_url } = body

  const { error } = await supabase
    .from('relatorios')
    .update({
      ...(identificacao !== undefined ? { identificacao } : {}),
      conclusao: conclusao ?? null,
      obs_clinicas: obs_clinicas ?? null,
      ...(pdf_url !== undefined ? { pdf_url } : {}),
    })
    .eq('id', id)

  if (error) return NextResponse.json({ error: 'Erro ao atualizar relatório' }, { status: 500 })
  return NextResponse.json({ success: true })
}
