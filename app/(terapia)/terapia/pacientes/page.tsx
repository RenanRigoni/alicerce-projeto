import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import { PacientesListaTerapeuta } from './PacientesListaTerapeuta'
import { temPermissao } from '@/lib/permissoes/definicoes'

export default async function TerapiaPacientesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, permissoes')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'terapeuta') notFound()

  const permissoes = (profile.permissoes ?? {}) as Record<string, boolean>
  const podeCadastrarPacientes = temPermissao(profile.role, permissoes, 'cadastrar_pacientes')
  const podeVerTodosPacientes = temPermissao(profile.role, permissoes, 'ver_todos_pacientes')

  let todos: any[] = []

  if (podeVerTodosPacientes) {
    const { data } = await createAdminClient()
      .from('pacientes')
      .select('id, nome, codigo_interno, status, frequencia_atendimento')
      .order('nome')
    todos = data ?? []
  } else {
    const { data: vinculos } = await supabase
      .from('paciente_terapeutas')
      .select('pacientes(id, nome, codigo_interno, status, frequencia_atendimento)')
      .eq('terapeuta_id', user.id)

    todos = (vinculos ?? [])
      .map((v: any) => v.pacientes)
      .filter(Boolean)
      .sort((a: any, b: any) => a.nome.localeCompare(b.nome))
  }

  return (
    <PacientesListaTerapeuta
      todos={todos}
      podeCadastrarPacientes={podeCadastrarPacientes}
      mostrandoTodosPacientes={podeVerTodosPacientes}
    />
  )
}
