import { createClient } from '@/lib/supabase/server'

export type UserRole = 'admin' | 'terapeuta' | 'recepcao' | 'pai'

export async function getUserRole(): Promise<UserRole | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const { data } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  return (data?.role as UserRole) ?? null
}

export function getDashboardByRole(role: UserRole): string {
  switch (role) {
    case 'pai':      return '/portal/dashboard'
    case 'terapeuta': return '/terapia/dashboard'
    case 'admin':
    case 'recepcao': return '/admin/dashboard'
  }
}
