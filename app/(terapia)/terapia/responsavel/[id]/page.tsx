import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import { Card } from '@/components/ui/Card'

export default async function ResponsavelTerapeutaPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'terapeuta') notFound()

  const { data: usuario } = await supabase
    .from('profiles')
    .select('id, nome, role, ativo')
    .eq('id', id)
    .eq('role', 'pai')
    .single()

  if (!usuario) notFound()

  const { data: authUser } = await createAdminClient().auth.admin.getUserById(id)
  const email = authUser?.user?.email ?? null

  const { data: detalhes } = await supabase
    .from('responsaveis_detalhes')
    .select('telefone_principal, endereco, cidade, cep, contato_emergencia')
    .eq('id', id)
    .maybeSingle()

  const { data: pacientesVinculo } = await supabase
    .from('paciente_responsaveis')
    .select('tipo, pacientes(id, nome, status)')
    .eq('responsavel_id', id)

  const pacientesDoTerapeuta = await supabase
    .from('paciente_terapeutas')
    .select('paciente_id')
    .eq('terapeuta_id', user.id)

  const meusIds = (pacientesDoTerapeuta.data ?? []).map((p: any) => p.paciente_id)
  const meusPacientes = (pacientesVinculo ?? []).filter((p: any) => meusIds.includes(p.pacientes?.id))

  return (
    <div className="space-y-6 max-w-xl">
      <div className="flex items-center gap-3 flex-wrap">
        <a href="/terapia/responsaveis" className="text-sm transition-colors hover:opacity-70" style={{ color: 'var(--color-ink-soft)' }}>
          ← Voltar
        </a>
        <h1 className="text-2xl font-semibold flex-1" style={{ fontFamily: 'var(--font-lora)', color: 'var(--color-ink)' }}>
          {usuario.nome}
        </h1>
        <a
          href={`/terapia/responsavel/${id}/editar`}
          className="text-sm font-medium px-3 py-1.5 rounded-xl transition-opacity hover:opacity-80"
          style={{ border: '1px solid var(--color-border)', color: 'var(--color-ink-soft)' }}
        >
          Editar
        </a>
      </div>

      <Card>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <div className="text-xs uppercase tracking-wide mb-0.5" style={{ color: 'var(--color-ink-faint)' }}>Nome completo</div>
            <div className="text-sm" style={{ color: 'var(--color-ink)' }}>{usuario.nome}</div>
          </div>
          {email && (
            <div className="col-span-2">
              <div className="text-xs uppercase tracking-wide mb-0.5" style={{ color: 'var(--color-ink-faint)' }}>E-mail</div>
              <div className="text-sm" style={{ color: 'var(--color-ink)' }}>{email}</div>
            </div>
          )}
          {detalhes?.telefone_principal && (
            <div>
              <div className="text-xs uppercase tracking-wide mb-0.5" style={{ color: 'var(--color-ink-faint)' }}>Telefone</div>
              <div className="text-sm" style={{ color: 'var(--color-ink)' }}>{detalhes.telefone_principal}</div>
            </div>
          )}
          {detalhes?.cidade && (
            <div>
              <div className="text-xs uppercase tracking-wide mb-0.5" style={{ color: 'var(--color-ink-faint)' }}>Cidade</div>
              <div className="text-sm" style={{ color: 'var(--color-ink)' }}>{detalhes.cidade}</div>
            </div>
          )}
          {detalhes?.endereco && (
            <div className="col-span-2">
              <div className="text-xs uppercase tracking-wide mb-0.5" style={{ color: 'var(--color-ink-faint)' }}>Endereço</div>
              <div className="text-sm" style={{ color: 'var(--color-ink)' }}>
                {detalhes.endereco}{detalhes.cep ? ` — CEP ${detalhes.cep}` : ''}
              </div>
            </div>
          )}
          {detalhes?.contato_emergencia && (
            <div className="col-span-2">
              <div className="text-xs uppercase tracking-wide mb-0.5" style={{ color: 'var(--color-ink-faint)' }}>Contato de emergência</div>
              <div className="text-sm" style={{ color: 'var(--color-ink)' }}>{detalhes.contato_emergencia}</div>
            </div>
          )}
          {!detalhes?.telefone_principal && !detalhes?.cidade && !detalhes?.endereco && !detalhes?.contato_emergencia && (
            <div className="col-span-2">
              <p className="text-sm" style={{ color: 'var(--color-ink-faint)' }}>
                Dados de contato não preenchidos.{' '}
                <a href={`/terapia/responsavel/${id}/editar`} style={{ color: 'var(--color-rose-main)' }}>Preencher agora →</a>
              </p>
            </div>
          )}
        </div>
      </Card>

      {meusPacientes.length > 0 && (
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--color-ink-soft)' }}>
            Pacientes vinculados
          </h2>
          <div className="space-y-2">
            {meusPacientes.map((p: any) => (
              <a key={p.pacientes?.id} href={`/terapia/paciente/${p.pacientes?.id}`}>
                <Card className="hover:shadow-md transition-all cursor-pointer">
                  <div className="flex items-center justify-between">
                    <div className="font-medium" style={{ color: 'var(--color-ink)' }}>{p.pacientes?.nome}</div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--color-sage-light)', color: 'var(--color-sage-deep)' }}>
                        {p.tipo === 'principal' ? 'Principal' : 'Secundário'}
                      </span>
                      <span className="text-xs" style={{ color: 'var(--color-sage-main)' }}>Ver →</span>
                    </div>
                  </div>
                </Card>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
