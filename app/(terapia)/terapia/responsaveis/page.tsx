import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { ResponsaveisListaTerapeuta } from './ResponsaveisListaTerapeuta'
import { temPermissao } from '@/lib/permissoes/definicoes'

export default async function TerapiaResponsaveisPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, permissoes')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'terapeuta') notFound()
  if (!temPermissao(profile.role, (profile.permissoes ?? {}) as Record<string, boolean>, 'gerenciar_responsaveis')) notFound()

  const { data: vinculos } = await supabase
    .from('paciente_terapeutas')
    .select('pacientes(id, nome, status, paciente_responsaveis(tipo, profiles(id, nome, responsaveis_detalhes(telefone_principal, cidade))))')
    .eq('terapeuta_id', user.id)

  type StatusPaciente = 'ativo' | 'alta' | 'desativado'
  interface Responsavel {
    id: string
    nome: string
    telefone: string | null
    cidade: string | null
    pacientes: Array<{ id: string; nome: string; status: StatusPaciente }>
  }

  const responsaveisMap = new Map<string, Responsavel>()

  for (const vinculo of (vinculos ?? [])) {
    const paciente = (vinculo as any).pacientes
    if (!paciente) continue
    for (const pr of (paciente.paciente_responsaveis ?? [])) {
      if (!pr.profiles) continue
      const resp = pr.profiles
      if (!responsaveisMap.has(resp.id)) {
        responsaveisMap.set(resp.id, {
          id: resp.id,
          nome: resp.nome,
          telefone: resp.responsaveis_detalhes?.telefone_principal ?? null,
          cidade: resp.responsaveis_detalhes?.cidade ?? null,
          pacientes: [],
        })
      }
      const entry = responsaveisMap.get(resp.id)!
      if (!entry.pacientes.find((p: any) => p.id === paciente.id)) {
        entry.pacientes.push({ id: paciente.id, nome: paciente.nome, status: paciente.status })
      }
    }
  }

  const todos = Array.from(responsaveisMap.values()).sort((a, b) => a.nome.localeCompare(b.nome))

  return <ResponsaveisListaTerapeuta todos={todos} />
}
