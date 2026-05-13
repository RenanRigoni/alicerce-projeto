import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { notificarResponsaveisDoPaciente } from '@/lib/notificacoes/inserir'

export const runtime = 'nodejs'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })

  const { data: evolucao } = await supabase
    .from('evolucoes')
    .select('identificacao, paciente_id, status, terapeuta_id')
    .eq('id', id)
    .single()

  if (!evolucao) return NextResponse.json({ error: 'Nao encontrada' }, { status: 404 })
  if (evolucao.terapeuta_id !== user.id) return NextResponse.json({ error: 'Sem permissao' }, { status: 403 })
  if (evolucao.status === 'publicado') return NextResponse.json({ error: 'Evolucao ja publicada' }, { status: 409 })

  const { error: updateError } = await supabase
    .from('evolucoes')
    .update({ status: 'publicado' })
    .eq('id', id)

  if (updateError) return NextResponse.json({ error: 'Erro ao publicar evolucao' }, { status: 500 })

  await notificarResponsaveisDoPaciente(
    evolucao.paciente_id,
    'evolucao_publicada',
    'Nova evolucao disponivel',
    'Acesse o portal para visualizar o conteudo apos login.',
    `/portal/paciente/${evolucao.paciente_id}?aba=evolucoes`,
    {
      related_patient_id: evolucao.paciente_id,
      related_entity_type: 'evolucao',
      related_entity_id: id,
    }
  )

  return NextResponse.json({ success: true })
}
