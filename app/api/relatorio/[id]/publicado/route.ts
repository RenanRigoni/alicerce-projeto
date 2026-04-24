import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { notificarResponsaveisDoPaciente } from '@/lib/notificacoes/inserir'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { data: relatorio } = await supabase
    .from('relatorios')
    .select('identificacao, paciente_id, conclusao, status, terapeuta_id')
    .eq('id', id)
    .single()

  if (!relatorio) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })
  if (relatorio.terapeuta_id !== user.id) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  if (relatorio.status !== 'publicado') return NextResponse.json({ error: 'Relatório não publicado' }, { status: 409 })

  await notificarResponsaveisDoPaciente(
    relatorio.paciente_id,
    'relatorio_publicado',
    `Novo relatório disponível: ${relatorio.identificacao ?? 'Relatório'}`,
    relatorio.conclusao?.slice(0, 120) || undefined,
    `/portal/paciente/${relatorio.paciente_id}?aba=relatorios`
  )

  return NextResponse.json({ success: true })
}
