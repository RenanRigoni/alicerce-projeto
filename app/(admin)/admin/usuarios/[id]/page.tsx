import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { notFound } from 'next/navigation'
import { AcoesUsuario } from './AcoesUsuario'
import { AgendaSemanalTerapeuta } from '@/components/admin/AgendaSemanalTerapeuta'

const roleLabel: Record<string, string> = {
  admin: 'Admin', recepcao: 'Recepção', terapeuta: 'Terapeuta', pai: 'Família',
}
const roleColor: Record<string, 'blue' | 'yellow' | 'green' | 'rose' | 'gray'> = {
  admin: 'blue', recepcao: 'yellow', terapeuta: 'green', pai: 'rose',
}
const statusLabel: Record<string, string> = { ativo: 'Ativo', alta: 'Alta', desativado: 'Inativo' }
const statusColor: Record<string, 'green' | 'blue' | 'rose'> = { ativo: 'green', alta: 'blue', desativado: 'rose' }

function Campo({ label, valor }: { label: string; valor?: string | null }) {
  if (!valor) return null
  return (
    <div>
      <div className="text-xs uppercase tracking-wide mb-0.5" style={{ color: 'var(--color-ink-faint)' }}>
        {label}
      </div>
      <div className="text-sm" style={{ color: 'var(--color-ink)' }}>{valor}</div>
    </div>
  )
}

export default async function UsuarioDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const adminClient = createAdminClient()

  const { data: { user: me } } = await supabase.auth.getUser()
  const { data: meProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', me!.id)
    .single()

  const [
    { data: usuario },
    { data: authUser },
  ] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, nome, role, ativo, criado_em, telefone, crefito')
      .eq('id', id)
      .single(),
    adminClient.auth.admin.getUserById(id),
  ])

  if (!usuario) notFound()

  const email = authUser.user?.email ?? null
  const ativo: boolean = usuario.ativo ?? true

  // Dados específicos por role
  let pacientes: Array<{ id: string; nome: string; codigo_interno: string | null; status: string; horarios_atendimento: any[]; convenio_ou_particular: string | null }> = []
  let detalhesResponsavel: { endereco: string | null; cidade: string | null; cep: string | null; telefone_principal: string | null; contato_emergencia: string | null } | null = null

  if (usuario.role === 'pai') {
    const [{ data: vinculosPac }, { data: detalhes }] = await Promise.all([
      supabase
        .from('paciente_responsaveis')
        .select('pacientes(id, nome, codigo_interno, status, horarios_atendimento, convenio_ou_particular)')
        .eq('responsavel_id', id),
      supabase
        .from('responsaveis_detalhes')
        .select('endereco, cidade, cep, telefone_principal, contato_emergencia')
        .eq('id', id)
        .maybeSingle(),
    ])
    pacientes = (vinculosPac ?? []).map((v: any) => v.pacientes).filter(Boolean)
    detalhesResponsavel = detalhes ?? null
  }

  // Pacientes do terapeuta (apenas ativos, para agenda)
  let pacientesTerapeuta: Array<{ id: string; nome: string; horarios_atendimento: Array<{ dia: string; hora: string }> }> = []
  let feriadosDatas: string[] = []

  if (usuario.role === 'terapeuta') {
    const [{ data: vinculos }, { data: feriados }] = await Promise.all([
      supabase
        .from('paciente_terapeutas')
        .select('pacientes(id, nome, status, horarios_atendimento)')
        .eq('terapeuta_id', id),
      supabase.from('feriados').select('data'),
    ])
    pacientesTerapeuta = (vinculos ?? [])
      .map((v: any) => v.pacientes)
      .filter((p: any) => p && p.status === 'ativo')
    feriadosDatas = (feriados ?? []).map((f: any) => f.data)
  }

  const isAdminOuRecepcao = meProfile?.role === 'admin' || meProfile?.role === 'recepcao'
  const isAdmin = meProfile?.role === 'admin'
  const isRecepcao = meProfile?.role === 'recepcao'
  const isSelf = me!.id === id

  return (
    <div className="space-y-6 max-w-xl">
      {/* Cabeçalho */}
      <div className="flex items-center gap-3 flex-wrap">
        <a
          href={usuario.role === 'pai' ? '/admin/responsaveis' : usuario.role === 'terapeuta' ? '/admin/terapeutas' : '/admin/usuarios'}
          className="text-sm transition-colors hover:opacity-70"
          style={{ color: 'var(--color-ink-soft)' }}
        >
          ← Voltar
        </a>
        <h1 className="text-2xl font-semibold" style={{ fontFamily: 'var(--font-lora)', color: 'var(--color-ink)' }}>
          {usuario.nome}
        </h1>
        <Badge color={roleColor[usuario.role] ?? 'gray'}>{roleLabel[usuario.role] ?? usuario.role}</Badge>
        {!ativo && <Badge color="gray">Inativo</Badge>}
        {isAdminOuRecepcao && (
          <a
            href={`/admin/usuarios/${id}/editar`}
            className="ml-auto text-sm font-medium px-3 py-1.5 rounded-xl transition-opacity hover:opacity-80"
            style={{ border: '1px solid var(--color-border)', color: 'var(--color-ink-mid)', background: 'var(--color-warm-white)' }}
          >
            Editar
          </a>
        )}
      </div>

      {/* Dados do perfil */}
      <Card>
        <div className="grid grid-cols-2 gap-4">
          <Campo label="Nome completo" valor={usuario.nome} />
          <Campo label="E-mail" valor={email} />
          <Campo label="Telefone" valor={detalhesResponsavel?.telefone_principal ?? usuario.telefone} />
          {usuario.role === 'terapeuta' && <Campo label="CREFITO" valor={usuario.crefito} />}
          {detalhesResponsavel?.endereco && (
            <div className="col-span-2">
              <Campo label="Endereço" valor={`${detalhesResponsavel.endereco}${detalhesResponsavel.cidade ? ` — ${detalhesResponsavel.cidade}` : ''}${detalhesResponsavel.cep ? `, CEP ${detalhesResponsavel.cep}` : ''}`} />
            </div>
          )}
          {detalhesResponsavel?.contato_emergencia && (
            <div className="col-span-2">
              <Campo label="Contato de emergência" valor={detalhesResponsavel.contato_emergencia} />
            </div>
          )}
          <Campo label="Cadastrado em" valor={new Date(usuario.criado_em).toLocaleDateString('pt-BR')} />
          <Campo label="Status" valor={ativo ? 'Ativo' : 'Inativo'} />
        </div>
        {!ativo && (
          <div className="mt-4 text-sm font-medium" style={{ color: '#B91C1C' }}>
            Acesso bloqueado — este usuário não consegue fazer login.
          </div>
        )}
      </Card>

      {/* Ações */}
      {isAdminOuRecepcao && (
        <AcoesUsuario
          usuarioId={usuario.id}
          ativo={ativo}
          isAdmin={isAdmin}
          isRecepcao={isRecepcao}
          targetRole={usuario.role}
          isSelf={isSelf}
        />
      )}

      {/* Agenda semanal — terapeuta (componente client com navegação) */}
      {usuario.role === 'terapeuta' && (
        <AgendaSemanalTerapeuta
          pacientes={pacientesTerapeuta}
          feriadosDatas={feriadosDatas}
        />
      )}

      {/* Pacientes vinculados — pai */}
      {usuario.role === 'pai' && pacientes.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-base font-semibold" style={{ color: 'var(--color-ink-mid)' }}>
            Pacientes vinculados
          </h2>
          <div className="space-y-2">
            {pacientes.map(p => (
              <a key={p.id} href={`/admin/pacientes/${p.id}`}>
                <Card className="hover:shadow-sm transition-all cursor-pointer">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-medium" style={{ color: 'var(--color-ink)' }}>{p.nome}</div>
                      {p.convenio_ou_particular && (
                        <div className="text-xs mt-0.5" style={{ color: 'var(--color-ink-soft)' }}>
                          {p.convenio_ou_particular === 'convenio' ? 'Convênio' : 'Particular'}
                        </div>
                      )}
                    </div>
                    <Badge color={statusColor[p.status] ?? 'gray'}>{statusLabel[p.status] ?? p.status}</Badge>
                  </div>
                </Card>
              </a>
            ))}
          </div>
        </div>
      )}

      {usuario.role === 'pai' && pacientes.length === 0 && (
        <div className="space-y-3">
          <h2 className="text-base font-semibold" style={{ color: 'var(--color-ink-mid)' }}>Pacientes vinculados</h2>
          <div className="flex items-center justify-between">
            <Card className="flex-1">
              <p className="text-sm" style={{ color: 'var(--color-ink-faint)' }}>Nenhum paciente cadastrado ainda.</p>
            </Card>
            <a
              href={`/admin/pacientes/novo?responsavel_id=${id}`}
              className="ml-3 text-sm font-medium px-4 py-2 rounded-xl text-white transition-all duration-200"
              style={{ background: 'var(--color-rose-main)' }}
            >
              + Cadastrar paciente
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
