import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { notFound } from 'next/navigation'
import { AcoesUsuario } from './AcoesUsuario'
import { AgendaSemanalTerapeuta } from '@/components/admin/AgendaSemanalTerapeuta'
import { datasFeriadosParaBloqueio } from '@/lib/agenda/feriados'
import { formatarConselhoProfissional, getTipoProfissionalConfig } from '@/lib/profissionais'
import { PermissoesEditor } from '@/components/admin/PermissoesEditor'
import { getPerfilPermissoesAtual } from '@/lib/permissoes/verificar'

const roleLabel: Record<string, string> = {
  admin: 'Admin', recepcao: 'Recepção', terapeuta: 'Profissional', pai: 'Família',
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

function AvatarUsuario({ nome, fotoUrl, role }: { nome: string; fotoUrl?: string | null; role: string }) {
  const bg: Record<string, string> = { admin: 'var(--color-rose-blush)', recepcao: 'var(--color-amber-light)', terapeuta: 'var(--color-sage-light)', pai: 'var(--color-peach-light)' }
  const cl: Record<string, string> = { admin: 'var(--color-rose-deep)', recepcao: 'var(--color-amber-deep)', terapeuta: 'var(--color-sage-deep)', pai: 'var(--color-peach-main)' }
  const ini = nome.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
  if (fotoUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={fotoUrl} alt={nome} loading="lazy" className="w-14 h-14 rounded-full object-cover flex-shrink-0" />
  }
  return (
    <div
      className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-semibold flex-shrink-0"
      style={{ background: bg[role] ?? '#F3F4F6', color: cl[role] ?? '#374151' }}
    >
      {ini}
    </div>
  )
}

function formatarCpfCnpj(valor?: string | null) {
  const d = valor?.replace(/\D/g, '') ?? ''
  if (d.length === 11) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`
  if (d.length === 14) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`
  return valor ?? null
}

export default async function UsuarioDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const adminClient = createAdminClient()

  const perfilAtual = await getPerfilPermissoesAtual()
  if (!perfilAtual) notFound()

  const { data: usuario } = await supabase
    .from('profiles')
    .select('id, nome, role, ativo, criado_em, telefone, crefito, cpf_cnpj, tipo_profissional, conselho_tipo, conselho_numero, conselho_uf, cbo_codigo, permissoes, foto_url, data_nascimento, sexo, especialidade, biografia')
    .eq('id', id)
    .single()
  if (!usuario) notFound()

  const podeGerenciarUsuarios = perfilAtual.efetivas.gerenciar_usuarios === true
  const podeGerenciarEsteResponsavel = usuario.role === 'pai' && perfilAtual.efetivas.gerenciar_responsaveis === true
  if (!podeGerenciarUsuarios && !podeGerenciarEsteResponsavel) notFound()

  const { data: authUser } = await adminClient.auth.admin.getUserById(id)

  const email = authUser.user?.email ?? null
  const ativo: boolean = usuario.ativo ?? true
  const tipoProfissional = usuario.role === 'terapeuta'
    ? getTipoProfissionalConfig(usuario.tipo_profissional)
    : null
  const conselhoProfissional = usuario.role === 'terapeuta'
    ? formatarConselhoProfissional({
        tipoProfissional: usuario.tipo_profissional,
        conselhoTipo: usuario.conselho_tipo,
        conselhoNumero: usuario.conselho_numero,
        conselhoUf: usuario.conselho_uf,
        crefitoLegado: usuario.crefito,
      })
    : ''

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
  const canceladasKeys: string[] = []
  const confirmacoesIniciais: Record<string, { token: string; status: string }> = {}

  if (usuario.role === 'terapeuta') {
    const [{ data: vinculos }, { data: feriados }, { data: configAgenda }] = await Promise.all([
      supabase
        .from('paciente_terapeutas')
        .select('horarios_atendimento, pacientes(id, nome, status)')
        .eq('terapeuta_id', id),
      supabase.from('feriados').select('data, anual'),
      supabase
        .from('configuracoes_clinica')
        .select('bloquear_feriados')
        .eq('singleton', 'default')
        .maybeSingle(),
    ])
    pacientesTerapeuta = (vinculos ?? [])
      .map((v: any) => ({ ...v.pacientes, horarios_atendimento: v.horarios_atendimento ?? [] }))
      .filter((p: any) => p && p.status === 'ativo')
    const anoAtual = new Date().getFullYear()
    feriadosDatas = datasFeriadosParaBloqueio(
      feriados ?? [],
      anoAtual - 1,
      anoAtual + 2,
      configAgenda?.bloquear_feriados === true,
    )

    const pacientesIds = pacientesTerapeuta.map(p => p.id)
    if (pacientesIds.length > 0) {
      const { data: confirmacoes } = await adminClient
        .from('sessao_confirmacoes')
        .select('paciente_id, data_hora, token, status')
        .in('paciente_id', pacientesIds)
      for (const c of confirmacoes ?? []) {
        const brt = new Date(new Date(c.data_hora).getTime() - 3 * 60 * 60 * 1000)
        const key = `${c.paciente_id}_${brt.toISOString().slice(0, 10)}_${brt.toISOString().slice(11, 16)}`
        if (c.status === 'cancelada') {
          canceladasKeys.push(key)
        } else {
          confirmacoesIniciais[key] = { token: c.token, status: c.status }
        }
      }
    }
  }

  const isAdminOuRecepcao = podeGerenciarUsuarios || podeGerenciarEsteResponsavel
  const isAdmin = perfilAtual.role === 'admin'
  const isRecepcao = perfilAtual.role === 'recepcao'
  const isSelf = perfilAtual.id === id

  return (
    <div className="space-y-6 max-w-xl">
      {/* Cabeçalho */}
      <div className="flex items-start gap-4 flex-wrap">
        <AvatarUsuario nome={usuario.nome} fotoUrl={usuario.foto_url} role={usuario.role} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap mb-1">
            <a
              href={usuario.role === 'pai' ? '/admin/responsaveis' : usuario.role === 'terapeuta' ? '/admin/terapeutas' : '/admin/usuarios'}
              className="text-sm transition-colors hover:opacity-70"
              style={{ color: 'var(--color-ink-soft)' }}
            >
              ← Voltar
            </a>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
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
        </div>
      </div>

      {/* Dados do perfil */}
      <Card>
        <div className="grid grid-cols-2 gap-4">
          <Campo label="Nome completo" valor={usuario.nome} />
          <Campo label="E-mail" valor={email} />
          <Campo label="Telefone" valor={detalhesResponsavel?.telefone_principal ?? usuario.telefone} />
          <Campo label="Data de nascimento" valor={usuario.data_nascimento ? new Date(usuario.data_nascimento + 'T12:00:00').toLocaleDateString('pt-BR') : null} />
          <Campo label="CPF/CNPJ" valor={formatarCpfCnpj(usuario.cpf_cnpj)} />
          <Campo label="Sexo" valor={usuario.sexo === 'masculino' ? 'Masculino' : usuario.sexo === 'feminino' ? 'Feminino' : usuario.sexo === 'outro' ? 'Outro' : null} />
          {tipoProfissional && <Campo label="Tipo profissional" valor={tipoProfissional.label} />}
          {usuario.role === 'terapeuta' && <Campo label="Conselho" valor={conselhoProfissional} />}
          {usuario.role === 'terapeuta' && <Campo label="Código CBO" valor={usuario.cbo_codigo ? `CBO ${usuario.cbo_codigo}` : null} />}
          {usuario.especialidade && <Campo label="Especialidade" valor={usuario.especialidade} />}
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
          {usuario.biografia && (
            <div className="col-span-2">
              <Campo label="Biografia" valor={usuario.biografia} />
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

      {/* Permissões — apenas admin pode editar */}
      {isAdmin && (
        <PermissoesEditor
          usuarioId={usuario.id}
          role={usuario.role}
          permissoesAtuais={usuario.permissoes ?? {}}
        />
      )}

      {/* Ações */}
      {isAdminOuRecepcao && (
        <AcoesUsuario
          usuarioId={usuario.id}
          ativo={ativo}
          isAdmin={isAdmin}
          isRecepcao={isRecepcao}
          targetRole={usuario.role}
          isSelf={isSelf}
          podeAlterarStatus={podeGerenciarUsuarios}
        />
      )}

      {/* Agenda semanal — terapeuta (componente client com navegação) */}
      {usuario.role === 'terapeuta' && (
        <AgendaSemanalTerapeuta
          pacientes={pacientesTerapeuta}
          feriadosDatas={feriadosDatas}
          canceladasKeys={canceladasKeys}
          confirmacoesIniciais={confirmacoesIniciais}
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
            {perfilAtual.efetivas.cadastrar_pacientes && (
              <a
                href={`/admin/pacientes/novo?responsavel_id=${id}`}
                className="ml-3 text-sm font-medium px-4 py-2 rounded-xl text-white transition-all duration-200"
                style={{ background: 'var(--color-rose-main)' }}
              >
                + Cadastrar paciente
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
