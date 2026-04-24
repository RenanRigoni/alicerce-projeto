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

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'terapeuta') notFound()

  const { data: vinculo } = await supabase
    .from('paciente_terapeutas')
    .select('paciente_id')
    .eq('paciente_id', id)
    .eq('terapeuta_id', user.id)
    .maybeSingle()

  if (!vinculo) notFound()

  const { data: paciente } = await supabase
    .from('pacientes')
    .select('id, nome, data_nascimento, sexo, frequencia_atendimento, turno_preferencia, horarios_atendimento')
    .eq('id', id)
    .single()

  if (!paciente) notFound()

  return <EditarPacienteTerapeutaForm paciente={paciente} />
}
