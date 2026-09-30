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
    .select('nome, role, ativo, consentimento_aceito_em, consentimento_policy_versao, permissoes, foto_url, senha_definida_em')
    .eq('id', user.id)
    .single()

  if (!profile || !profile.ativo || profile.role !== 'pai') redirect('/login')

  // Redirect de página inteira (não modal): {children} nem chega a renderizar.
  // Antes do bloqueio de acesso e do consentimento, para não empilhar dois avisos.
  if (!profile.senha_definida_em) redirect('/definir-senha')

  // Acesso bloqueado pelo admin (inadimplência, disputa entre responsáveis, etc.)
  if ((profile.permissoes as Record<string, boolean>)?.bloquear_acesso_portal === true) {
    redirect('/login?bloqueado=1')
  }

  const precisaConsentimento =
    !profile.consentimento_aceito_em ||
    profile.consentimento_policy_versao !== POLICY_VERSION

  return (
    <div className="min-h-screen overflow-x-hidden" style={{ background: 'var(--color-peach-light)' }}>
      <Sidebar role="pai" nome={profile.nome} fotoUrl={profile.foto_url ?? null} />
      {precisaConsentimento && <ConsentimentoModal />}
      <main className="lg:pl-16 pt-14 lg:pt-0">
        <div className="max-w-5xl mx-auto px-4 py-8 animate-fade-up">
          {children}
        </div>
      </main>
    </div>
  )
}
