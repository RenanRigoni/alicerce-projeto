import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Navbar } from '@/components/layout/Navbar'

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('nome, role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'pai') redirect('/login')

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-peach-light)' }}>
      <Navbar role="pai" nome={profile.nome} />
      <main className="max-w-5xl mx-auto px-4 py-8 animate-fade-up">
        {children}
      </main>
    </div>
  )
}
