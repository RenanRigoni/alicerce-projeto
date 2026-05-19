import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/Sidebar'
import { todasPermissoes } from '@/lib/permissoes/definicoes'

export default async function TerapiaLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('nome, role, permissoes, foto_url')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'terapeuta') redirect('/login')

  return (
    <div className="min-h-screen overflow-x-hidden" style={{ background: 'var(--color-sage-light)' }}>
      <Sidebar
        role="terapeuta"
        nome={profile.nome}
        fotoUrl={profile.foto_url ?? null}
        permissoes={todasPermissoes(profile.role, (profile.permissoes ?? {}) as Record<string, boolean>)}
      />
      <main className="lg:pl-16 pt-14 lg:pt-0">
        <div className="max-w-5xl mx-auto px-4 py-8 animate-fade-up">
          {children}
        </div>
      </main>
    </div>
  )
}
