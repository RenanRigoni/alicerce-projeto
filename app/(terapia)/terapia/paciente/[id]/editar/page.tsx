import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import { EditarPacienteTerapeutaForm } from './EditarPacienteTerapeutaForm'
import { temPermissao } from '@/lib/permissoes/definicoes'

export default async function EditarPacienteTerapeutaPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  const { data: profile } = await supabase.from('profiles').select('role, permissoes').eq('id', user.id).single()
  if (profile?.role !== 'terapeuta') notFound()
  const permissoes = (profile.permissoes ?? {}) as Record<string, boolean>
  if (!temPermissao(profile.role, permissoes, 'editar_pacientes')) notFound()
  const podeVerTodosPacientes = temPermissao(profile.role, permissoes, 'ver_todos_pacientes')

  const { data: vinculo } = await supabase
    .from('paciente_terapeutas')
    .select('paciente_id')
    .eq('paciente_id', id)
    .eq('terapeuta_id', user.id)
    .maybeSingle()

  if (!vinculo && !podeVerTodosPacientes) notFound()

  const dbPaciente = vinculo ? supabase : createAdminClient()
  const { data: paciente } = await dbPaciente
    .from('pacientes')
    .select('id, nome, data_nascimento, sexo, frequencia_atendimento, turno_preferencia, horarios_atendimento')
    .eq('id', id)
    .single()

  if (!paciente) notFound()

  return <EditarPacienteTerapeutaForm paciente={paciente} />
}
