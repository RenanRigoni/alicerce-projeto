import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// Relatório PUBLICADO não se edita nem se apaga: foi emitido e entregue, e a cópia do documento
// emitido tem de ficar arquivada — a família leva aquele relatório para a escola, para o plano,
// para o INSS, e a guarda responde a profissional junto com a clínica (COFFITO 414/2012 para
// fisio e TO, CFP 006/2019 + 001/2009 para psicologia; prontuário digital, mínimo 20 anos pela
// Lei 13.787/2018). Rascunho nunca saiu da clínica: não é documento, é trabalho em andamento, e
// a autora apaga o dela. A policy "relatorios: exclusão terapeuta" é a tranca de verdade.

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
    return NextResponse.json({ error: 'Apenas profissionais podem editar relatórios' }, { status: 403 })
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

  // `.select('id')` revela a escrita que a RLS descarta: a RESTRICTIVE somente_leitura_pos_alta
  // barra o UPDATE de paciente inativo afetando 0 linhas SEM erro, e sem isso a rota respondia
  // { success: true } sem ter salvo nada.
  const { data: atualizados, error } = await supabase
    .from('relatorios')
    .update({
      ...(identificacao !== undefined ? { identificacao } : {}),
      conclusao: conclusao ?? null,
      obs_clinicas: obs_clinicas ?? null,
      ...(pdf_url !== undefined ? { pdf_url } : {}),
    })
    .eq('id', id)
    .select('id')

  if (error) return NextResponse.json({ error: 'Erro ao atualizar relatório' }, { status: 500 })
  if (!atualizados || atualizados.length === 0) {
    return NextResponse.json(
      { error: 'Não foi possível salvar. Se o paciente recebeu alta, o prontuário é somente leitura.' },
      { status: 409 }
    )
  }
  return NextResponse.json({ success: true })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'terapeuta') {
    return NextResponse.json({ error: 'Apenas profissionais podem excluir relatórios' }, { status: 403 })
  }

  const { data: relatorio } = await supabase
    .from('relatorios')
    .select('id, terapeuta_id, status')
    .eq('id', id)
    .single()

  if (!relatorio) return NextResponse.json({ error: 'Relatório não encontrado' }, { status: 404 })
  if (relatorio.terapeuta_id !== user.id) {
    return NextResponse.json({ error: 'Só quem escreveu o relatório pode excluí-lo.' }, { status: 403 })
  }
  if (relatorio.status === 'publicado') {
    return NextResponse.json(
      {
        error: 'Relatório publicado não pode ser excluído: a cópia do documento entregue à família '
          + 'tem de ficar arquivada. Para corrigir, publique um novo relatório.',
      },
      { status: 409 }
    )
  }

  // `.select('id')` revela a exclusão que a RLS descarta — depois da alta a RESTRICTIVE
  // somente_leitura_pos_alta barra o DELETE afetando 0 linhas SEM erro. O trigger
  // audit_relatorios grava `excluiu` com a autora e a data.
  const { data: apagados, error } = await supabase.from('relatorios').delete().eq('id', id).select('id')

  if (error) return NextResponse.json({ error: 'Erro ao excluir relatório.' }, { status: 500 })
  if (!apagados || apagados.length === 0) {
    return NextResponse.json(
      { error: 'Não foi possível excluir. Se o paciente recebeu alta, o prontuário é somente leitura.' },
      { status: 409 }
    )
  }

  return NextResponse.json({ success: true })
}
