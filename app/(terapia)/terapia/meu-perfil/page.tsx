import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { MeuPerfilForm } from '@/components/perfil/MeuPerfilForm'
import Link from 'next/link'

export default async function MeuPerfilTerapiaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('nome, role, telefone, cpf_cnpj, criado_em')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'terapeuta') redirect('/login')

  const adminClient = createAdminClient()
  const { data: authUser } = await adminClient.auth.admin.getUserById(user.id)
  const email = authUser.user?.email ?? null

  return (
    <div className="max-w-lg space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/terapia/dashboard"
          className="text-sm transition-opacity hover:opacity-70"
          style={{ color: 'var(--color-ink-soft)', textDecoration: 'none' }}
        >
          ← Voltar
        </Link>
        <h1
          className="text-2xl font-semibold"
          style={{ fontFamily: 'var(--font-lora)', color: 'var(--color-ink)' }}
        >
          Meu perfil
        </h1>
      </div>

      <MeuPerfilForm
        nome={profile.nome ?? ''}
        email={email}
        telefone={profile.telefone ?? null}
        cpf={profile.cpf_cnpj ?? null}
        role={profile.role}
        criadoEm={profile.criado_em}
      />
    </div>
  )
}
