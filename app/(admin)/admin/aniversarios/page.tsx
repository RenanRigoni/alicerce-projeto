import { createClient } from '@/lib/supabase/server'
import { getPerfilPermissoesAtual } from '@/lib/permissoes/verificar'
import { notFound } from 'next/navigation'
import { AniversariosClient, type Aniversariante } from '@/components/admin/AniversariosClient'

export default async function AniversariosPage() {
  const perfil = await getPerfilPermissoesAtual()
  if (!perfil?.efetivas.ver_todos_pacientes) notFound()

  const supabase = await createClient()

  const { data: raw } = await supabase
    .from('pacientes')
    .select(`
      id, nome, data_nascimento, foto_url,
      paciente_responsaveis(
        tipo,
        profiles(id, nome, responsaveis_detalhes(telefone_principal))
      )
    `)
    .eq('status', 'ativo')
    .not('data_nascimento', 'is', null)
    .order('nome')

  const aniversariantes: Aniversariante[] = (raw ?? []).map((p: any) => {
    const responsaveis = (p.paciente_responsaveis ?? []) as any[]
    const principal = responsaveis.find((r: any) => r.tipo === 'principal') ?? responsaveis[0] ?? null
    const prof = principal?.profiles
    return {
      id: p.id,
      nome: p.nome,
      data_nascimento: p.data_nascimento as string,
      foto_url: p.foto_url ?? null,
      responsavel: prof
        ? {
            id: prof.id,
            nome: prof.nome,
            telefone: prof.responsaveis_detalhes?.telefone_principal ?? null,
          }
        : null,
    }
  })

  return <AniversariosClient aniversariantes={aniversariantes} />
}
