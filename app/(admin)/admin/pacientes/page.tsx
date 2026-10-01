import { createClient } from '@/lib/supabase/server'
import { PacientesLista } from './PacientesLista'
import { notFound } from 'next/navigation'
import { getPerfilPermissoesAtual } from '@/lib/permissoes/verificar'
import { pacientesAtivosSemResponsavel } from '@/lib/qualidade-dados/responsaveis'

export default async function PacientesPage({ searchParams }: { searchParams: Promise<{ sem_responsavel?: string | string[] }> }) {
  const perfil = await getPerfilPermissoesAtual()
  if (!perfil?.efetivas.ver_todos_pacientes) notFound()

  const supabase = await createClient()

  const { data } = await supabase
    .from('pacientes')
    .select('id, nome, codigo_interno, status, frequencia_atendimento, criado_em')
    .order('nome')
  const todos = data ?? []

  // Vem do painel de qualidade de dados da home: ativos sem nenhum responsável vinculado.
  if ((await searchParams).sem_responsavel === '1') {
    const { data: vinculos } = await supabase.from('paciente_responsaveis').select('paciente_id')
    const ids = new Set(pacientesAtivosSemResponsavel(todos, vinculos ?? []))
    return (
      <PacientesLista
        todos={todos.filter(p => ids.has(p.id))}
        podeCadastrarPacientes={perfil.efetivas.cadastrar_pacientes}
        semResponsavel
      />
    )
  }

  return <PacientesLista todos={todos} podeCadastrarPacientes={perfil.efetivas.cadastrar_pacientes} />
}
