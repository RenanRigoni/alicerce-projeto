import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { EditarPacienteTerapeutaForm } from './EditarPacienteTerapeutaForm'

export default async function EditarPacienteTerapeutaPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: paciente } = await supabase
    .from('pacientes')
    .select('*')
    .eq('id', id)
    .single()

  if (!paciente) notFound()

  return <EditarPacienteTerapeutaForm paciente={paciente} />
}
