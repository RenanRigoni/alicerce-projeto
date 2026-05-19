import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { ComunicadoCard } from '@/components/ui/ComunicadoCard'
import { gerarSessoes } from '@/lib/agenda/sessoes'
import { datasFeriadosParaBloqueio } from '@/lib/agenda/feriados'
import { CAMPANHAS } from '@/lib/campanhas-saude'
import { getPerfilPermissoesAtual } from '@/lib/permissoes/verificar'

const MESES = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro']
const tipoLabel: Record<string, string> = { devolutiva: 'Devolutiva', reuniao: 'Reunião', reposicao: 'Reposição', bloqueio: 'Indisponível', outro: 'Outro' }

function dd(n: number) { return String(n).padStart(2, '0') }

export default async function AdminDashboard() {
  const supabase = await createClient()
  const perfilAtual = await getPerfilPermissoesAtual()
  const permissoes = perfilAtual?.efetivas

  const isRecepcao = perfilAtual?.role === 'recepcao'
  const podeVerPacientes = permissoes?.ver_todos_pacientes === true
  const podeGerenciarResponsaveis = permissoes?.gerenciar_responsaveis === true
  const podeGerenciarUsuarios = permissoes?.gerenciar_usuarios === true
  const podeCriarAgendamentos = permissoes?.criar_agendamentos === true
  const podeVerRelatorios = permissoes?.ver_relatorios_todos === true
  const podeGerenciarFeriados = permissoes?.gerenciar_feriados === true
  const podeCriarComunicados = permissoes?.criar_comunicados === true
  const podeCadastrarPacientes = permissoes?.cadastrar_pacientes === true
  const podeRegistrarAlta = permissoes?.registrar_alta === true

  // Datas em BRT (UTC-3) para filtros de hoje/semana/mês
  const agora = new Date()
  const agoraBRT = new Date(agora.getTime() - 3 * 60 * 60 * 1000)
  const todayBRT = `${agoraBRT.getUTCFullYear()}-${dd(agoraBRT.getUTCMonth() + 1)}-${dd(agoraBRT.getUTCDate())}`

  const hojeInicio = new Date(`${todayBRT}T00:00:00-03:00`)
  const hojeFim    = new Date(`${todayBRT}T23:59:59-03:00`)

  const dowBRT = agoraBRT.getUTCDay()
  const diasAteSeg = (dowBRT + 6) % 7
  const segBRT = new Date(agoraBRT.getTime() - diasAteSeg * 86400000)
  const segStr = `${segBRT.getUTCFullYear()}-${dd(segBRT.getUTCMonth() + 1)}-${dd(segBRT.getUTCDate())}`
  const semanaInicio = new Date(`${segStr}T00:00:00-03:00`)
  const semanaFim    = new Date(semanaInicio.getTime() + 7 * 86400000 - 1000)

  const mesAtualBRT  = agoraBRT.getUTCMonth() + 1
  const anoAtualBRT  = agoraBRT.getUTCFullYear()
  const ultimoDiaMes = new Date(anoAtualBRT, mesAtualBRT, 0).getDate()
  const mesInicio    = new Date(`${anoAtualBRT}-${dd(mesAtualBRT)}-01T00:00:00-03:00`)
  const mesFim       = new Date(`${anoAtualBRT}-${dd(mesAtualBRT)}-${dd(ultimoDiaMes)}T23:59:59-03:00`)

  const nomeMes  = MESES[mesAtualBRT - 1]
  const campanha = CAMPANHAS[agoraBRT.getUTCMonth()]

  const [
    { count: totalPacientes },
    { data: familiasDados },
    { count: totalTerapeutas },
    { data: altasPendentes },
    { data: altasRecentes },
    { data: relatóriosRecentes },
    { data: feriados },
    { data: configAgenda },
    { data: comunicados },
    { data: pacientesHoje },
    { data: agendamentosHoje },
    { data: confirmacoesHoje },
    { data: confirmacoesSemana },
    { data: confirmacoesMes },
    { data: pacientesAniv },
    { data: profissionaisAniv },
  ] = await Promise.all([
    podeVerPacientes
      ? supabase.from('pacientes').select('*', { count: 'exact', head: true }).eq('status', 'ativo')
      : Promise.resolve({ count: 0 }),
    podeGerenciarResponsaveis
      ? supabase
          .from('paciente_responsaveis')
          .select('responsavel_id, pacientes!inner(status)')
          .eq('pacientes.status', 'ativo')
      : Promise.resolve({ data: [] }),
    podeGerenciarUsuarios
      ? supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'terapeuta').eq('ativo', true)
      : Promise.resolve({ count: 0 }),
    podeRegistrarAlta
      ? supabase
          .from('solicitacoes_alta')
          .select('id, criado_em, motivo, pacientes(nome), profiles!solicitacoes_alta_solicitado_por_fkey(nome)')
          .eq('status', 'pendente')
          .order('criado_em', { ascending: true })
      : Promise.resolve({ data: [] }),
    podeRegistrarAlta
      ? supabase
          .from('solicitacoes_alta')
          .select('criado_em, pacientes(id, nome), profiles!solicitacoes_alta_solicitado_por_fkey(nome)')
          .in('status', ['confirmada', 'registrada', 'aprovada'])
          .order('criado_em', { ascending: false })
          .limit(5)
      : Promise.resolve({ data: [] }),
    podeVerRelatorios
      ? supabase
          .from('relatorios')
          .select('id, paciente_id, identificacao, status, conclusao, criado_em, pacientes!inner(nome)')
          .not('paciente_id', 'is', null)
          .order('criado_em', { ascending: false })
          .limit(5)
      : Promise.resolve({ data: [] }),
    (podeGerenciarFeriados || podeCriarAgendamentos)
      ? supabase
          .from('feriados')
          .select('data, descricao, anual')
          .order('data')
      : Promise.resolve({ data: [] }),
    podeCriarAgendamentos
      ? supabase
          .from('configuracoes_clinica')
          .select('bloquear_feriados')
          .eq('singleton', 'default')
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from('comunicados')
      .select('id, titulo, conteudo, criado_em, profiles(nome)')
      .order('criado_em', { ascending: false })
      .limit(3),
    podeCriarAgendamentos
      ? supabase
          .from('pacientes')
          .select('id, nome, horarios_atendimento')
          .eq('status', 'ativo')
      : Promise.resolve({ data: [] }),
    podeCriarAgendamentos
      ? supabase
          .from('agendamentos')
          .select('id, tipo, titulo, data_hora, pacientes(nome)')
          .gte('data_hora', hojeInicio.toISOString())
          .lte('data_hora', hojeFim.toISOString())
          .order('data_hora')
      : Promise.resolve({ data: [] }),
    podeCriarAgendamentos
      ? supabase
          .from('sessao_confirmacoes')
          .select('paciente_id, data_hora, status')
          .gte('data_hora', hojeInicio.toISOString())
          .lte('data_hora', hojeFim.toISOString())
      : Promise.resolve({ data: [] }),
    podeCriarAgendamentos
      ? supabase
          .from('sessao_confirmacoes')
          .select('status')
          .gte('data_hora', semanaInicio.toISOString())
          .lte('data_hora', semanaFim.toISOString())
      : Promise.resolve({ data: [] }),
    podeCriarAgendamentos
      ? supabase
          .from('sessao_confirmacoes')
          .select('status')
          .gte('data_hora', mesInicio.toISOString())
          .lte('data_hora', mesFim.toISOString())
      : Promise.resolve({ data: [] }),
    podeVerPacientes
      ? supabase
          .from('pacientes')
          .select('id, nome, data_nascimento, foto_url')
          .eq('status', 'ativo')
          .not('data_nascimento', 'is', null)
      : Promise.resolve({ data: [] }),
    supabase
      .from('profiles')
      .select('id, nome, data_nascimento, foto_url, role')
      .in('role', ['terapeuta', 'recepcao', 'admin'])
      .eq('ativo', true)
      .not('data_nascimento', 'is', null),
  ])

  const totalFamilias = new Set((familiasDados ?? []).map((f: any) => f.responsavel_id)).size

  // Aniversariantes do mês
  type Aniversariante = { id: string; nome: string; dia: number; tipo: 'paciente' | 'profissional'; fotoUrl: string | null }
  const mesStr = dd(mesAtualBRT)
  const diaHojeBRT = agoraBRT.getUTCDate()
  const aniversariantesMes: Aniversariante[] = [
    ...(pacientesAniv ?? [])
      .filter((p: any) => (p.data_nascimento as string).split('-')[1] === mesStr)
      .map((p: any) => ({
        id: p.id, nome: p.nome,
        dia: parseInt((p.data_nascimento as string).split('-')[2]),
        tipo: 'paciente' as const,
        fotoUrl: p.foto_url ?? null,
      })),
    ...(profissionaisAniv ?? [])
      .filter((p: any) => (p.data_nascimento as string).split('-')[1] === mesStr)
      .map((p: any) => ({
        id: p.id, nome: p.nome,
        dia: parseInt((p.data_nascimento as string).split('-')[2]),
        tipo: 'profissional' as const,
        fotoUrl: p.foto_url ?? null,
      })),
  ].sort((a, b) => a.dia - b.dia)

  // Feriados do mês atual
  const mesAtualStr = dd(mesAtualBRT)
  const feriadosDoMes = (feriados ?? [])
    .flatMap((f: any) => {
      const [, fMes, fDia] = (f.data as string).split('-')
      if (fMes !== mesAtualStr) return []
      const dataAnoAtual = `${anoAtualBRT}-${fMes}-${fDia}`
      const dt = new Date(`${dataAnoAtual}T12:00:00`)
      if (String(dt.getMonth() + 1).padStart(2, '0') !== fMes) return []
      if (dataAnoAtual < todayBRT) return []
      return [{ data: dataAnoAtual, descricao: f.descricao as string }]
    })
    .sort((a, b) => a.data.localeCompare(b.data))

  const feriadosDatasBloqueio = datasFeriadosParaBloqueio(
    feriados ?? [],
    anoAtualBRT - 1,
    anoAtualBRT + 2,
    configAgenda?.bloquear_feriados === true,
  )

  // Agenda de hoje: sessões recorrentes + agendamentos manuais
  const sessoesHoje = gerarSessoes(
    (pacientesHoje ?? []) as Array<{ id: string; nome: string; horarios_atendimento: Array<{ dia: string; hora: string }> }>,
    hojeInicio,
    hojeFim,
    feriadosDatasBloqueio,
  )

  const confirmMap = new Map<string, string>()
  for (const c of confirmacoesHoje ?? []) {
    confirmMap.set(
      `${(c as any).paciente_id}|${new Date((c as any).data_hora).toISOString()}`,
      (c as any).status,
    )
  }

  type AgendaItem = { hora: string; nome: string; status?: string; tipoTag?: string }

  const agendaHoje: AgendaItem[] = []
  for (const s of sessoesHoje) {
    const key = `${s.paciente!.id}|${new Date(s.data_hora).toISOString()}`
    const status = confirmMap.get(key)
    if (status === 'cancelada') continue
    agendaHoje.push({ hora: s.data_hora.slice(11, 16), nome: s.paciente!.nome, status: status ?? 'sem_envio' })
  }
  for (const a of agendamentosHoje ?? []) {
    const dtBRT = new Date(new Date((a as any).data_hora).getTime() - 3 * 60 * 60 * 1000)
    agendaHoje.push({
      hora: `${dd(dtBRT.getUTCHours())}:${dd(dtBRT.getUTCMinutes())}`,
      nome: (a as any).titulo ?? (a as any).pacientes?.nome ?? '—',
      tipoTag: (a as any).tipo !== 'sessao' ? ((a as any).tipo as string) : undefined,
    })
  }
  agendaHoje.sort((a, b) => a.hora.localeCompare(b.hora))

  // Esta semana
  const confirmadasSemana = (confirmacoesSemana ?? []).filter((c: any) => c.status === 'confirmada' || c.status === 'expirada').length
  const canceladasSemana = (confirmacoesSemana ?? []).filter((c: any) => c.status === 'cancelada').length

  // Taxa do mês
  const confirmadasMes = (confirmacoesMes ?? []).filter((c: any) => c.status === 'confirmada' || c.status === 'expirada').length
  const canceladasMes = (confirmacoesMes ?? []).filter((c: any) => c.status === 'cancelada').length
  const totalMesPres  = confirmadasMes + canceladasMes
  const taxaMes       = totalMesPres > 0 ? Math.round((confirmadasMes / totalMesPres) * 100) : 0

  return (
    <div className="space-y-6">
      <div>
        <h1
          className="text-2xl font-semibold"
          style={{ fontFamily: 'var(--font-lora)', color: 'var(--color-ink)' }}
        >
          Visão geral
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--color-ink-soft)' }}>
          {isRecepcao ? 'Painel da recepção' : 'Painel administrativo'}
        </p>
      </div>

      {/* Banner de altas pendentes */}
      {altasPendentes && altasPendentes.length > 0 && (
        <div
          className="rounded-2xl px-5 py-4"
          style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}
        >
          <div className="flex items-center gap-2.5 mb-3">
            <span
              className="w-5 h-5 rounded-full text-white text-xs font-bold flex items-center justify-center flex-shrink-0"
              style={{ background: '#F59E0B' }}
            >
              {altasPendentes.length}
            </span>
            <span className="text-sm font-semibold" style={{ color: '#92400E' }}>
              {altasPendentes.length === 1 ? 'Solicitação de alta pendente' : 'Solicitações de alta pendentes'}
            </span>
          </div>
          <ul className="space-y-2">
            {altasPendentes.map((a: any) => (
              <li key={a.id} className="flex items-center justify-between gap-3">
                <div className="text-sm" style={{ color: '#78350F' }}>
                  <span className="font-medium">{a.pacientes?.nome}</span>
                  <span style={{ color: '#B45309' }}> · por {a.profiles?.nome}</span>
                </div>
                <Link
                  href="/admin/alta"
                  className="text-xs font-medium rounded-lg px-3 py-1 transition-colors flex-shrink-0"
                  style={{ color: '#92400E', border: '1px solid #FCD34D', background: 'transparent' }}
                >
                  Analisar
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Cards de totais */}
      <div className="grid grid-cols-3 gap-4">
        {podeVerPacientes && (
        <Link href="/admin/pacientes">
          <Card className="hover:shadow-md transition-all duration-200 cursor-pointer group">
            <div
              className="text-3xl font-bold mb-1 group-hover:scale-105 transition-transform duration-200 inline-block"
              style={{ color: 'var(--color-rose-main)', fontFamily: 'var(--font-lora)' }}
            >
              {totalPacientes ?? 0}
            </div>
            <div className="text-sm" style={{ color: 'var(--color-ink-soft)' }}>Pacientes ativos</div>
          </Card>
        </Link>
        )}
        {podeGerenciarResponsaveis && (
        <Link href="/admin/responsaveis">
          <Card className="hover:shadow-md transition-all duration-200 cursor-pointer group">
            <div
              className="text-3xl font-bold mb-1 group-hover:scale-105 transition-transform duration-200 inline-block"
              style={{ color: 'var(--color-peach-main)', fontFamily: 'var(--font-lora)' }}
            >
              {totalFamilias}
            </div>
            <div className="text-sm" style={{ color: 'var(--color-ink-soft)' }}>Famílias ativas</div>
          </Card>
        </Link>
        )}
        {podeGerenciarUsuarios && (
        <Link href="/admin/terapeutas">
          <Card className="hover:shadow-md transition-all duration-200 cursor-pointer group">
            <div
              className="text-3xl font-bold mb-1 group-hover:scale-105 transition-transform duration-200 inline-block"
              style={{ color: 'var(--color-sage-main)', fontFamily: 'var(--font-lora)' }}
            >
              {totalTerapeutas ?? 0}
            </div>
            <div className="text-sm" style={{ color: 'var(--color-ink-soft)' }}>Profissionais</div>
          </Card>
        </Link>
        )}
      </div>

      {/* Agenda de Hoje + Esta Semana */}
      {podeCriarAgendamentos && (
      <div>
        <h2
          className="text-xs font-semibold uppercase tracking-wider mb-3"
          style={{ color: 'var(--color-ink-soft)' }}
        >
          Hoje &amp; esta semana
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">

          {/* Agenda de hoje */}
          <Card>
            <p className="text-sm font-semibold mb-3" style={{ color: 'var(--color-ink)' }}>Agenda de hoje</p>
            {agendaHoje.length > 0 ? (
              <div>
                {agendaHoje.map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 py-2"
                    style={{ borderBottom: i < agendaHoje.length - 1 ? '1px solid var(--color-border-soft)' : 'none' }}
                  >
                    <span
                      className="text-xs font-bold flex-shrink-0 w-10"
                      style={{ color: 'var(--color-rose-main)' }}
                    >
                      {item.hora}
                    </span>
                    <span className="flex-1 text-xs truncate" style={{ color: 'var(--color-ink)' }}>
                      {item.nome}
                    </span>
                    {item.tipoTag ? (
                      <span
                        className="text-xs px-1.5 py-0.5 rounded-full flex-shrink-0"
                        style={{ background: '#EDE8E3', color: '#6B5E57' }}
                      >
                        {tipoLabel[item.tipoTag] ?? item.tipoTag}
                      </span>
                    ) : item.status === 'confirmada' || item.status === 'expirada' ? (
                      <span className="text-xs flex-shrink-0" style={{ color: '#16A34A' }}>✅ confirmada</span>
                    ) : item.status === 'pendente' ? (
                      <span className="text-xs flex-shrink-0" style={{ color: '#D97706' }}>⏳ pendente</span>
                    ) : (
                      <span className="text-xs flex-shrink-0" style={{ color: '#9CA3AF' }}>— sem envio</span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm" style={{ color: 'var(--color-ink-faint)' }}>Nenhuma sessão hoje.</p>
            )}
          </Card>

          {/* Esta semana */}
          <Card>
            <p className="text-sm font-semibold mb-3" style={{ color: 'var(--color-ink)' }}>Esta semana</p>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div
                className="rounded-xl p-2.5 text-center"
                style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}
              >
                <div className="text-2xl font-bold" style={{ color: '#16A34A' }}>{confirmadasSemana}</div>
                <div className="text-xs mt-0.5" style={{ color: '#6B7280' }}>Confirmadas</div>
              </div>
              <div
                className="rounded-xl p-2.5 text-center"
                style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}
              >
                <div className="text-2xl font-bold" style={{ color: '#DC2626' }}>{canceladasSemana}</div>
                <div className="text-xs mt-0.5" style={{ color: '#6B7280' }}>Canceladas</div>
              </div>
            </div>
            <div className="flex items-center justify-between text-xs mb-1.5" style={{ color: '#6B7280' }}>
              <span>Taxa — {nomeMes}</span>
              <strong style={{ color: '#16A34A' }}>{taxaMes}%</strong>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#E5E7EB' }}>
              <div
                className="h-full rounded-full"
                style={{ width: `${taxaMes}%`, background: '#16A34A' }}
              />
            </div>
            <div className="text-xs mt-2" style={{ color: '#9CA3AF' }}>
              {confirmadasMes} confirmadas · {canceladasMes} canceladas no mês
            </div>
          </Card>

        </div>
      </div>
      )}

      {/* Altas recentes */}
      {altasRecentes && altasRecentes.length > 0 && (
        <div>
          <h2
            className="text-xs font-semibold uppercase tracking-wider mb-3"
            style={{ color: 'var(--color-ink-soft)' }}
          >
            Altas recentes
          </h2>
          <Card>
            <ul className="space-y-2">
              {altasRecentes.map((a: any, i: number) => (
                <li key={i} className="flex items-center justify-between gap-3">
                  <div className="text-sm min-w-0">
                    <span className="font-medium" style={{ color: 'var(--color-ink)' }}>
                      {(a.pacientes as any)?.nome ?? '—'}
                    </span>
                    {(a.profiles as any)?.nome && (
                      <span style={{ color: 'var(--color-ink-soft)' }}> · {(a.profiles as any).nome}</span>
                    )}
                  </div>
                  <span className="text-xs flex-shrink-0" style={{ color: 'var(--color-ink-faint)' }}>
                    {new Date(a.criado_em).toLocaleDateString('pt-BR')}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}

      {/* Relatórios recentes */}
      {podeVerRelatorios && (
        <div>
          <h2
            className="text-xs font-semibold uppercase tracking-wider mb-3"
            style={{ color: 'var(--color-ink-soft)' }}
          >
            Relatórios recentes
          </h2>
          <Card>
            {relatóriosRecentes && relatóriosRecentes.length > 0 ? (
              <ul className="space-y-1">
                {relatóriosRecentes.map((r: any) => (
                  <li key={r.id}>
                    <Link
                      href={`/admin/pacientes/${r.paciente_id}`}
                      className="flex items-start justify-between gap-3 rounded-xl px-3 py-2.5 -mx-3 transition-colors hover:bg-[var(--color-rose-blush)]"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium" style={{ color: 'var(--color-ink)' }}>
                          {r.pacientes?.nome ?? '—'}
                          {r.identificacao && (
                            <span style={{ color: 'var(--color-ink-soft)', fontWeight: 400 }}>
                              {' — '}{r.identificacao}
                            </span>
                          )}
                        </div>
                        {r.conclusao && (
                          <div
                            className="text-xs mt-0.5 line-clamp-1"
                            style={{ color: 'var(--color-ink-soft)' }}
                          >
                            {r.conclusao}
                          </div>
                        )}
                        <div className="text-xs mt-0.5" style={{ color: 'var(--color-ink-faint)' }}>
                          {new Date(r.criado_em).toLocaleDateString('pt-BR')}
                        </div>
                      </div>
                      <span
                        className="px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 mt-0.5"
                        style={r.status === 'publicado'
                          ? { background: 'var(--color-sage-light)', color: 'var(--color-sage-deep)' }
                          : { background: '#FFFBEB', color: '#92400E' }
                        }
                      >
                        {r.status}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm" style={{ color: 'var(--color-ink-faint)' }}>Nenhum relatório ainda.</p>
            )}
          </Card>
        </div>
      )}

      {/* Próximo feriado do mês atual (apenas 1) */}
      {feriadosDoMes.length > 0 && (() => {
        const f = feriadosDoMes[0]
        return (
          <div>
            <h2
              className="text-xs font-semibold uppercase tracking-wider mb-3"
              style={{ color: 'var(--color-ink-soft)' }}
            >
              Próximo feriado
            </h2>
            <Card>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: 'var(--color-rose-soft)' }} />
                <div>
                  <span className="text-sm font-medium" style={{ color: 'var(--color-ink)' }}>{f.descricao}</span>
                  <span className="text-xs ml-2" style={{ color: 'var(--color-ink-soft)' }}>
                    {new Date(f.data + 'T12:00:00').toLocaleDateString('pt-BR', {
                      weekday: 'long', day: '2-digit', month: 'long',
                    })}
                  </span>
                </div>
              </div>
            </Card>
          </div>
        )
      })()}

      {/* Comunicados recentes */}
      {comunicados && comunicados.length > 0 && (
        <div>
          <h2
            className="text-xs font-semibold uppercase tracking-wider mb-3"
            style={{ color: 'var(--color-ink-soft)' }}
          >
            Comunicados recentes
          </h2>
          <div className="space-y-3">
            {comunicados.map((c: any) => (
              <ComunicadoCard
                key={c.id}
                titulo={c.titulo}
                conteudo={c.conteudo}
                autor={c.profiles?.nome}
                criado_em={c.criado_em}
              />
            ))}
          </div>
        </div>
      )}

      {/* Aniversariantes do mês */}
      {aniversariantesMes.length > 0 && (
        <div>
          <h2
            className="text-xs font-semibold uppercase tracking-wider mb-3"
            style={{ color: 'var(--color-ink-soft)' }}
          >
            Aniversariantes de {nomeMes}
          </h2>
          <Card>
            <div className="space-y-3">
              {aniversariantesMes.map(a => {
                const ini = a.nome.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
                const ehHoje = a.dia === diaHojeBRT
                const bgAvatar = a.tipo === 'paciente' ? 'var(--color-rose-blush)' : 'var(--color-sage-light)'
                const clAvatar = a.tipo === 'paciente' ? 'var(--color-rose-deep)' : 'var(--color-sage-deep)'
                return (
                  <div key={a.id} className="flex items-center gap-3">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0 overflow-hidden"
                      style={{ background: bgAvatar, color: clAvatar }}
                    >
                      {a.fotoUrl
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img src={a.fotoUrl} alt={a.nome} className="w-full h-full object-cover" />
                        : ini}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate flex items-center gap-2" style={{ color: 'var(--color-ink)' }}>
                        {a.nome}
                        {ehHoje && <span className="text-base" title="Hoje!">🎂</span>}
                      </div>
                      <div className="text-xs" style={{ color: 'var(--color-ink-faint)' }}>
                        {a.tipo === 'profissional' ? 'Profissional' : 'Paciente'}
                      </div>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <div
                        className="text-xl font-bold"
                        style={{
                          color: ehHoje ? 'var(--color-rose-main)' : 'var(--color-ink-mid)',
                          fontFamily: 'var(--font-lora)',
                        }}
                      >
                        {a.dia}
                      </div>
                      <div className="text-xs" style={{ color: 'var(--color-ink-faint)' }}>
                        {nomeMes.slice(0, 3)}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
        </div>
      )}

      {/* Campanha do mês */}
      <div>
        <h2
          className="text-xs font-semibold uppercase tracking-wider mb-3"
          style={{ color: 'var(--color-ink-soft)' }}
        >
          Campanha do mês
        </h2>
        <div
          className="rounded-2xl px-5 py-4 flex items-center gap-4"
          style={{ background: campanha.bg, border: `1px solid ${campanha.border}` }}
        >
          <div
            className="w-4 h-4 rounded-full flex-shrink-0"
            style={{ background: campanha.cor, boxShadow: `0 0 0 5px ${campanha.bg}` }}
          />
          <div>
            <div className="text-sm font-bold" style={{ color: campanha.cor }}>{campanha.titulo}</div>
            <div className="text-xs mt-0.5" style={{ color: campanha.cor, opacity: 0.8 }}>{campanha.descricao}</div>
          </div>
        </div>
      </div>

      {/* Ações rápidas */}
      <div>
        <h2
          className="text-xs font-semibold uppercase tracking-wider mb-3"
          style={{ color: 'var(--color-ink-soft)' }}
        >
          Ações rápidas
        </h2>
        <Card>
          <div className="flex flex-wrap gap-2.5">
            {podeCadastrarPacientes && (
            <Link
              href="/admin/pacientes/novo"
              className="text-sm font-medium px-4 py-2 rounded-xl text-white transition-all duration-200 active:scale-[0.98]"
              style={{ background: 'var(--color-rose-main)' }}
            >
              + Novo paciente
            </Link>
            )}
            {(podeGerenciarUsuarios || podeGerenciarResponsaveis) && (
            <Link
              href="/admin/usuarios/novo"
              className="text-sm font-medium px-4 py-2 rounded-xl transition-all duration-200 active:scale-[0.98]"
              style={{ background: 'var(--color-rose-blush)', color: 'var(--color-rose-deep)' }}
            >
              + Novo usuário
            </Link>
            )}
            {podeCriarAgendamentos && (
            <Link
              href="/admin/agendamentos/novo"
              className="text-sm font-medium px-4 py-2 rounded-xl transition-all duration-200 active:scale-[0.98]"
              style={{ background: 'var(--color-rose-blush)', color: 'var(--color-rose-deep)' }}
            >
              + Agendamento
            </Link>
            )}
            {podeCriarComunicados && (
            <Link
              href="/admin/comunicados"
              className="text-sm font-medium px-4 py-2 rounded-xl transition-all duration-200 active:scale-[0.98]"
              style={{ background: 'var(--color-border-soft)', color: 'var(--color-ink-mid)' }}
            >
              Comunicados
            </Link>
            )}
            {podeGerenciarFeriados && (
            <Link
              href="/admin/feriados"
              className="text-sm font-medium px-4 py-2 rounded-xl transition-all duration-200 active:scale-[0.98]"
              style={{ background: 'var(--color-border-soft)', color: 'var(--color-ink-mid)' }}
            >
              Feriados
            </Link>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
