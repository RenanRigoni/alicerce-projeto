import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getDashboardByRole, type UserRole } from '@/lib/auth/get-user-role'
import { DefinirSenhaForm } from './DefinirSenhaForm'

// Fica em (auth), fora de (admin)/(terapia)/(portal): o gate desses layouts
// redireciona para cá, então a tela não pode estar sob nenhum deles.
export default async function DefinirSenhaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, ativo, senha_definida_em')
    .eq('id', user.id)
    .single()

  if (!profile || !profile.ativo) redirect('/login')

  const dashboard = getDashboardByRole(profile.role as UserRole)

  // Já cumprida: a tela não fica acessível depois da troca.
  if (profile.senha_definida_em) redirect(dashboard)

  return <DefinirSenhaForm dashboard={dashboard} />
}
