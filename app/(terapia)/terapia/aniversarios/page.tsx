import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { AniversariosClient, type Aniversariante } from '@/components/admin/AniversariosClient'

export default async function TerapiaAniversariosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'terapeuta') notFound()

  const { data: vinculos } = await supabase
    .from('paciente_terapeutas')
    .select(`
      pacientes!inner(
        id, nome, data_nascimento, foto_url, status,
        paciente_responsaveis(
          tipo,
          profiles(id, nome, responsaveis_detalhes(telefone_principal))
        )
      )
    `)
    .eq('terapeuta_id', user.id)

  const aniversariantes: Aniversariante[] = (vinculos ?? [])
    .map((v: any) => v.pacientes)
    .filter((p: any) => p && p.status === 'ativo' && p.data_nascimento)
    .sort((a: any, b: any) => a.nome.localeCompare(b.nome))
    .map((p: any) => {
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

  return (
    <AniversariosClient
      aniversariantes={aniversariantes}
      titulo="Aniversários dos meus pacientes"
    />
  )
}
