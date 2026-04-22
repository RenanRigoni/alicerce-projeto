import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { EditarPacienteAdminForm } from './EditarPacienteAdminForm'

export default async function EditarPacienteAdminPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const [{ data: paciente }, { data: todosTerapeutas }, { data: vinculados }] = await Promise.all([
    supabase.from('pacientes').select('*').eq('id', id).single(),
    supabase.from('profiles').select('id, nome').eq('role', 'terapeuta').order('nome'),
    supabase.from('paciente_terapeutas').select('terapeuta_id').eq('paciente_id', id),
  ])

  if (!paciente) notFound()

  const terapeutasVinculados = (vinculados ?? []).map((v: any) => v.terapeuta_id)

  return (
    <EditarPacienteAdminForm
      paciente={paciente}
      todosTerapeutas={todosTerapeutas ?? []}
      terapeutasIniciais={terapeutasVinculados}
    />
  )
}
