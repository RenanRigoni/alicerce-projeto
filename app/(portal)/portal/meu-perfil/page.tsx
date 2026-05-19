import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { MeuPerfilForm } from '@/components/perfil/MeuPerfilForm'
import { Card } from '@/components/ui/Card'
import { EditarMeusDadosForm } from '@/components/portal/EditarMeusDadosForm'
import Link from 'next/link'

export default async function MeuPerfilPortalPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [
    { data: profile },
    { data: detalhes },
  ] = await Promise.all([
    supabase
      .from('profiles')
      .select('nome, role, cpf_cnpj, criado_em, foto_url, data_nascimento, rg, sexo')
      .eq('id', user.id)
      .single(),
    supabase
      .from('responsaveis_detalhes')
      .select('endereco, cidade, cep, numero, complemento, telefone_principal, contato_emergencia')
      .eq('id', user.id)
      .maybeSingle(),
  ])

  if (!profile || profile.role !== 'pai') redirect('/login')

  const email = user.email ?? null

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/portal/dashboard"
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
        telefone={null}
        cpf={profile.cpf_cnpj ?? null}
        role={profile.role}
        criadoEm={profile.criado_em}
        fotoUrl={profile.foto_url ?? null}
        dataNascimento={profile.data_nascimento ?? null}
        rg={profile.rg ?? null}
        sexo={profile.sexo ?? null}
        tipoProfissional={null}
        conselhoTipo={null}
        conselhoNumero={null}
        conselhoUf={null}
        cboCodigo={null}
        especialidade={null}
        biografia={null}
      />

      <Card>
        <div className="space-y-3">
          <div>
            <h3 className="text-sm font-semibold" style={{ color: 'var(--color-ink)' }}>
              Contato e endereço
            </h3>
            <p className="text-sm mt-1" style={{ color: 'var(--color-ink-soft)' }}>
              Telefone principal, endereço e contato de emergência.
            </p>
          </div>
          <EditarMeusDadosForm
            nome={profile.nome ?? ''}
            telefone={detalhes?.telefone_principal ?? null}
            contato_emergencia={detalhes?.contato_emergencia ?? null}
            endereco={detalhes?.endereco ?? null}
            cidade={detalhes?.cidade ?? null}
            cep={detalhes?.cep ?? null}
            hideNome
          />
        </div>
      </Card>
    </div>
  )
}
