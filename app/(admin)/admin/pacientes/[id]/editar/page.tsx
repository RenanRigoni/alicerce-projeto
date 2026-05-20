import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { EditarPacienteAdminForm } from './EditarPacienteAdminForm'
import { getPerfilPermissoesAtual } from '@/lib/permissoes/verificar'

export default async function EditarPacienteAdminPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const perfil = await getPerfilPermissoesAtual()
  if (!perfil?.efetivas.editar_pacientes) notFound()

  const supabase = await createClient()

  const [{ data: paciente }, { data: todosTerapeutas }, { data: vinculados }] = await Promise.all([
    supabase.from('pacientes').select('*').eq('id', id).single(),
    supabase.from('profiles').select('id, nome').eq('role', 'terapeuta').order('nome'),
    supabase.from('paciente_terapeutas').select('terapeuta_id, horarios_atendimento').eq('paciente_id', id),
  ])

  if (!paciente) notFound()

  // CPF Phase 2: decifra para pré-popular formulário
  const { data: cpfDecifrado } = await supabase.rpc('get_paciente_cpf', { p_patient_id: id })

  const terapeutasVinculados = (vinculados ?? []).map((v: any) => v.terapeuta_id)
  const horariosPorTerapeuta: Record<string, Array<{ dia: string; hora: string }>> = {}
  for (const v of vinculados ?? []) {
    horariosPorTerapeuta[(v as any).terapeuta_id] = (v as any).horarios_atendimento ?? []
  }

  return (
    <EditarPacienteAdminForm
      paciente={{ ...paciente, cpf: cpfDecifrado as string | null }}
      todosTerapeutas={todosTerapeutas ?? []}
      terapeutasIniciais={terapeutasVinculados}
      horariosPorTerapeuta={horariosPorTerapeuta}
      podeVincularTerapeutas={perfil.efetivas.vincular_terapeutas}
    />
  )
}
