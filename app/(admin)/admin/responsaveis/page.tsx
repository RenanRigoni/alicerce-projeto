import { createClient } from '@/lib/supabase/server'
import { getPerfilPermissoesAtual } from '@/lib/permissoes/verificar'
import { notFound } from 'next/navigation'
import { diagnosticarContato, lerFiltroResponsavel } from '@/lib/qualidade-dados/responsaveis'
import { formatarTelefone } from '@/lib/telefone'
import { ResponsaveisLista } from './ResponsaveisLista'

export default async function ResponsaveisPage({ searchParams }: { searchParams: Promise<{ problema?: string | string[] }> }) {
  const perfil = await getPerfilPermissoesAtual()
  if (!perfil?.efetivas.gerenciar_responsaveis) notFound()

  const supabase = await createClient()
  const filtroProblema = lerFiltroResponsavel((await searchParams).problema)

  const { data } = await supabase
    .from('profiles')
    .select(`
      id, nome, ativo, telefone,
      responsaveis_detalhes(telefone_principal, cidade, cep),
      paciente_responsaveis(tipo, pacientes(id, nome, codigo_interno, status))
    `)
    .eq('role', 'pai')
    .order('nome')

  const todos = (data ?? []).map((r: any) => {
    const detalhes = r.responsaveis_detalhes
    const diagnostico = diagnosticarContato({
      id: r.id,
      telefone_perfil: r.telefone ?? null,
      telefone_principal: detalhes?.telefone_principal ?? null,
      cep: detalhes?.cep ?? null,
    })
    return {
      id: r.id,
      nome: r.nome,
      ativo: r.ativo,
      telefone: detalhes?.telefone_principal ?? null,
      cidade: detalhes?.cidade ?? null,
      diagnostico,
      // Os dois cadastros lado a lado só quando divergem: é o que a recepção precisa para perguntar à família.
      telefonesDivergentes: diagnostico.telefoneDivergente
        ? { perfil: formatarTelefone(r.telefone), principal: formatarTelefone(detalhes?.telefone_principal) }
        : null,
      pacientes: (r.paciente_responsaveis ?? [])
        .filter((pr: any) => pr.pacientes)
        .map((pr: any) => ({
          id: pr.pacientes.id,
          nome: pr.pacientes.nome,
          codigo_interno: pr.pacientes.codigo_interno,
          status: pr.pacientes.status,
        })),
    }
  })

  return <ResponsaveisLista todos={todos} podeVerPacientes={perfil.efetivas.ver_todos_pacientes} filtroProblema={filtroProblema} />
}
