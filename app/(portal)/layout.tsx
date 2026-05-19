import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/Sidebar'
import { ConsentimentoModal } from '@/components/portal/ConsentimentoModal'
import { POLICY_VERSION } from '@/lib/consentimento'

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('nome, role, consentimento_aceito_em, consentimento_policy_versao, permissoes')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'pai') redirect('/login')

  // Acesso bloqueado pelo admin (inadimplência, disputa entre responsáveis, etc.)
  if ((profile.permissoes as Record<string, boolean>)?.bloquear_acesso_portal === true) {
    redirect('/login?bloqueado=1')
  }

  const precisaConsentimento =
    !profile.consentimento_aceito_em ||
    profile.consentimento_policy_versao !== POLICY_VERSION

  return (
    <div className="min-h-screen overflow-x-hidden" style={{ background: 'var(--color-peach-light)' }}>
      <Sidebar role="pai" nome={profile.nome} />
      {precisaConsentimento && <ConsentimentoModal />}
      <main className="lg:pl-16 pt-14 lg:pt-0">
        <div className="max-w-5xl mx-auto px-4 py-8 animate-fade-up">
          {children}
        </div>
      </main>
    </div>
  )
}
