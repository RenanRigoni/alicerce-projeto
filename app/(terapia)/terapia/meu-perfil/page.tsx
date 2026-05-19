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
    .select('nome, role, telefone, cpf_cnpj, criado_em, foto_url, data_nascimento, rg, sexo, tipo_profissional, conselho_tipo, conselho_numero, conselho_uf, cbo_codigo, especialidade, biografia')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'terapeuta') redirect('/login')

  const adminClient = createAdminClient()
  const { data: authUser } = await adminClient.auth.admin.getUserById(user.id)
  const email = authUser.user?.email ?? null

  return (
    <div className="max-w-2xl space-y-6">
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
        userId={user.id}
        nome={profile.nome ?? ''}
        email={email}
        telefone={profile.telefone ?? null}
        cpf={profile.cpf_cnpj ?? null}
        role={profile.role}
        criadoEm={profile.criado_em}
        fotoUrl={profile.foto_url ?? null}
        dataNascimento={profile.data_nascimento ?? null}
        rg={profile.rg ?? null}
        sexo={profile.sexo ?? null}
        tipoProfissional={profile.tipo_profissional ?? null}
        conselhoTipo={profile.conselho_tipo ?? null}
        conselhoNumero={profile.conselho_numero ?? null}
        conselhoUf={profile.conselho_uf ?? null}
        cboCodigo={profile.cbo_codigo ?? null}
        especialidade={profile.especialidade ?? null}
        biografia={profile.biografia ?? null}
      />
    </div>
  )
}
