import { createClient } from '@/lib/supabase/server'
import { getPerfilPermissoesAtual } from '@/lib/permissoes/verificar'
import { notFound } from 'next/navigation'
import { ResponsaveisLista } from './ResponsaveisLista'

export default async function ResponsaveisPage() {
  const perfil = await getPerfilPermissoesAtual()
  if (!perfil?.efetivas.gerenciar_responsaveis) notFound()

  const supabase = await createClient()

  const { data } = await supabase
    .from('profiles')
    .select(`
      id, nome, ativo,
      responsaveis_detalhes(telefone_principal, cidade),
      paciente_responsaveis(tipo, pacientes(id, nome, codigo_interno, status))
    `)
    .eq('role', 'pai')
    .order('nome')

  const todos = (data ?? []).map((r: any) => ({
    id: r.id,
    nome: r.nome,
    ativo: r.ativo,
    telefone: r.responsaveis_detalhes?.telefone_principal ?? null,
    cidade: r.responsaveis_detalhes?.cidade ?? null,
    pacientes: (r.paciente_responsaveis ?? [])
      .filter((pr: any) => pr.pacientes)
      .map((pr: any) => ({
        id: pr.pacientes.id,
        nome: pr.pacientes.nome,
        codigo_interno: pr.pacientes.codigo_interno,
        status: pr.pacientes.status,
      })),
  }))

  return <ResponsaveisLista todos={todos} podeVerPacientes={perfil.efetivas.ver_todos_pacientes} />
}
