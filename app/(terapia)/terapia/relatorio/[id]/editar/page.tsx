import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { EditarRelatorioForm } from './EditarRelatorioForm'

export default async function EditarRelatorioPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'terapeuta') notFound()

  const { data: relatorio } = await supabase
    .from('relatorios')
    .select('id, identificacao, conclusao, obs_clinicas, pdf_url, status, paciente_id, terapeuta_id')
    .eq('id', id)
    .single()

  if (!relatorio) notFound()
  if (relatorio.terapeuta_id !== user.id) notFound()
  if (relatorio.status === 'publicado') notFound()

  return <EditarRelatorioForm relatorio={relatorio} />
}
