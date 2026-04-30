import { createClient } from '@/lib/supabase/server'
import { temPermissao, type Permissao } from './definicoes'

/**
 * Verifica se o usuário autenticado tem uma permissão.
 * Uso em route handlers e Server Components onde o perfil ainda não foi carregado.
 * Se o perfil já está disponível, prefer chamar temPermissao() diretamente.
 */
export async function usuarioTemPermissao(chave: Permissao): Promise<boolean> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, permissoes')
    .eq('id', user.id)
    .single()

  if (!profile) return false
  return temPermissao(profile.role, profile.permissoes ?? {}, chave)
}
