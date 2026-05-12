import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Navbar } from '@/components/layout/Navbar'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('nome, role')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'recepcao'].includes(profile.role)) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen overflow-x-hidden" style={{ background: 'var(--color-cream)' }}>
      <Navbar role={profile.role as 'admin' | 'recepcao'} nome={profile.nome} />
      <main className="max-w-5xl mx-auto px-4 py-8 animate-fade-up">
        {children}
      </main>
    </div>
  )
}
