import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Navbar } from '@/components/layout/Navbar'
import { todasPermissoes } from '@/lib/permissoes/definicoes'

export default async function TerapiaLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('nome, role, permissoes')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'terapeuta') redirect('/login')

  return (
    <div className="min-h-screen overflow-x-hidden" style={{ background: 'var(--color-sage-light)' }}>
      <Navbar
        role="terapeuta"
        nome={profile.nome}
        permissoes={todasPermissoes(profile.role, (profile.permissoes ?? {}) as Record<string, boolean>)}
      />
      <main className="max-w-5xl mx-auto px-4 py-8 animate-fade-up">
        {children}
      </main>
    </div>
  )
}
