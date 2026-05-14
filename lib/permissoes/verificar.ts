import { createClient } from '@/lib/supabase/server'
import { temPermissao, todasPermissoes, type Permissao } from './definicoes'

export interface PerfilPermissoes {
  id: string
  role: string
  permissoes: Record<string, boolean>
  efetivas: ReturnType<typeof todasPermissoes>
}

export async function getPerfilPermissoesAtual(): Promise<PerfilPermissoes | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, permissoes')
    .eq('id', user.id)
    .single()

  if (!profile) return null
  const permissoes = (profile.permissoes ?? {}) as Record<string, boolean>
  return {
    id: user.id,
    role: profile.role,
    permissoes,
    efetivas: todasPermissoes(profile.role, permissoes),
  }
}

/**
 * Verifica se o usuário autenticado tem uma permissão.
 * Uso em route handlers e Server Components onde o perfil ainda não foi carregado.
 * Se o perfil já está disponível, prefer chamar temPermissao() diretamente.
 */
export async function usuarioTemPermissao(chave: Permissao): Promise<boolean> {
  const perfil = await getPerfilPermissoesAtual()
  if (!perfil) return false
  return temPermissao(perfil.role, perfil.permissoes, chave)
}
