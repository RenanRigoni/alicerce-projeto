import { createClient } from '@/lib/supabase/server'
import { PacientesLista } from './PacientesLista'
import { notFound } from 'next/navigation'
import { getPerfilPermissoesAtual } from '@/lib/permissoes/verificar'

export default async function PacientesPage() {
  const perfil = await getPerfilPermissoesAtual()
  if (!perfil?.efetivas.ver_todos_pacientes) notFound()

  const supabase = await createClient()

  const { data } = await supabase
    .from('pacientes')
    .select('id, nome, codigo_interno, status, frequencia_atendimento, criado_em')
    .order('nome')

  return <PacientesLista todos={data ?? []} podeCadastrarPacientes={perfil.efetivas.cadastrar_pacientes} />
}
