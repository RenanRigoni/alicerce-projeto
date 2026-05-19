import { createClient } from '@/lib/supabase/server'
import { Card } from '@/components/ui/Card'
import { ComunicadoCard } from '@/components/ui/ComunicadoCard'
import { gerarSessoes } from '@/lib/agenda/sessoes'
import { datasFeriadosParaBloqueio } from '@/lib/agenda/feriados'
import { CAMPANHAS } from '@/lib/campanhas-saude'

const MESES = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro']
const tipoLabel: Record<string, string> = {
  sessao: 'Sessão', devolutiva: 'Devolutiva', reuniao: 'Reunião', reposicao: 'Reposição', bloqueio: 'Indisponível', outro: 'Outro',
}

function dd(n: number) { return String(n).padStart(2, '0') }

export default async function TerapiaDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Datas em BRT (UTC-3)
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
  const em30dias = new Date(agora.getTime() + 30 * 24 * 60 * 60 * 1000)

  const mesAtualBRT  = agoraBRT.getUTCMonth() + 1
  const anoAtualBRT  = agoraBRT.getUTCFullYear()
  const ultimoDiaMes = new Date(anoAtualBRT, mesAtualBRT, 0).getDate()
  const mesInicio    = new Date(`${anoAtualBRT}-${dd(mesAtualBRT)}-01T00:00:00-03:00`)
  const mesFim       = new Date(`${anoAtualBRT}-${dd(mesAtualBRT)}-${dd(ultimoDiaMes)}T23:59:59-03:00`)

  const nomeMes  = MESES[mesAtualBRT - 1]
  const campanha = CAMPANHAS[agoraBRT.getUTCMonth()]

  const [
    { data: vinculos },
    { data: especiais },
    { data: feriados },
    { data: configAgenda },
    { data: comunicados },
    { data: vinculosAlta },
    { data: agendamentosHoje },
    { data: confirmacoesHoje },
    { data: confirmacoesProximas },
    { data: confirmacoesSemana },
    { data: confirmacoesMes },
  ] = await Promise.all([
    supabase
      .from('paciente_terapeutas')
      .select('paciente_id, pacientes(id, nome, foto_url, status, frequencia_atendimento, horarios_atendimento)')
      .eq('terapeuta_id', user!.id),
    supabase
      .from('agendamentos')
      .select('id, tipo, titulo, data_hora, duracao_minutos, pacientes(nome)')
      .eq('terapeuta_id', user!.id)
      .neq('tipo', 'sessao')
      .gte('data_hora', new Date().toISOString())
      .order('data_hora')
      .limit(10),
    supabase
      .from('feriados')
      .select('data, descricao, anual')
      .order('data'),
    supabase
      .from('configuracoes_clinica')
      .select('bloquear_feriados')
      .eq('singleton', 'default')
      .maybeSingle(),
    supabase
      .from('comunicados')
      .select('id, titulo, conteudo, criado_em')
      .order('criado_em', { ascending: false })
      .limit(3),
    supabase
      .from('paciente_terapeutas')
      .select('pacientes!inner(id, nome, status)')
      .eq('terapeuta_id', user!.id)
      .eq('pacientes.status', 'alta'),
    supabase
      .from('agendamentos')
      .select('id, tipo, titulo, data_hora, pacientes(nome)')
      .eq('terapeuta_id', user!.id)
      .gte('data_hora', hojeInicio.toISOString())
      .lte('data_hora', hojeFim.toISOString())
      .order('data_hora'),
    supabase
      .from('sessao_confirmacoes')
      .select('paciente_id, data_hora, status')
      .eq('terapeuta_id', user!.id)
      .gte('data_hora', hojeInicio.toISOString())
      .lte('data_hora', hojeFim.toISOString()),
    supabase
      .from('sessao_confirmacoes')
      .select('paciente_id, data_hora, status')
      .eq('terapeuta_id', user!.id)
      .gte('data_hora', agora.toISOString())
      .lte('data_hora', em30dias.toISOString()),
    supabase
      .from('sessao_confirmacoes')
      .select('status')
      .eq('terapeuta_id', user!.id)
      .gte('data_hora', semanaInicio.toISOString())
      .lte('data_hora', semanaFim.toISOString()),
    supabase
      .from('sessao_confirmacoes')
      .select('status')
      .eq('terapeuta_id', user!.id)
      .gte('data_hora', mesInicio.toISOString())
      .lte('data_hora', mesFim.toISOString()),
  ])

  const pacientesAtivos = (vinculos ?? []).filter((v: any) => v.pacientes?.status === 'ativo')
  const pacientesComAlta = (vinculosAlta ?? []).map((v: any) => v.pacientes).filter(Boolean)
  const pacientesComHorario = pacientesAtivos.map((v: any) => v.pacientes).filter(Boolean)

  const feriadosDatasBloqueio = datasFeriadosParaBloqueio(
    feriados ?? [],
    anoAtualBRT - 1,
    anoAtualBRT + 2,
    configAgenda?.bloquear_feriados === true,
  )

  // Próximas sessões (30 dias) para bloco de compromissos
  const sessoesProximas = gerarSessoes(
    pacientesComHorario as Array<{ id: string; nome: string; horarios_atendimento: Array<{ dia: string; hora: string }> }>,
    agora,
    em30dias,
    feriadosDatasBloqueio,
  )

  const canceladasProximasSet = new Set<string>()
  for (const c of confirmacoesProximas ?? []) {
    if ((c as any).status !== 'cancelada') continue
    const dt = new Date((c as any).data_hora)
    const brt = new Date(dt.getTime() - 3 * 60 * 60 * 1000)
    const brtDate = brt.toISOString().slice(0, 10)
    const brtHora = brt.toISOString().slice(11, 16)
    canceladasProximasSet.add(`${(c as any).paciente_id}_${brtDate}_${brtHora}`)
  }

  const proximosCompromissos = [
    ...sessoesProximas.filter(s => {
      if (!s.paciente) return true
      const key = `${s.paciente.id}_${s.data_hora.slice(0, 10)}_${s.data_hora.slice(11, 16)}`
      return !canceladasProximasSet.has(key)
    }),
    ...(especiais ?? []).map((a: any) => ({
      id: a.id,
      tipo: a.tipo,
      titulo: a.titulo,
      motivo: null,
      data_hora: a.data_hora,
      duracao_minutos: a.duracao_minutos,
      paciente: a.pacientes ? { id: '', nome: a.pacientes.nome } : null,
    })),
  ]
    .sort((a, b) => a.data_hora.localeCompare(b.data_hora))
    .slice(0, 5)

  // Agenda de hoje — sessões recorrentes do terapeuta + agendamentos manuais
  const sessoesHoje = gerarSessoes(
    pacientesComHorario as Array<{ id: string; nome: string; horarios_atendimento: Array<{ dia: string; hora: string }> }>,
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

  // Feriado do mês atual (apenas 1)
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
    .sort((a: { data: string }, b: { data: string }) => a.data.localeCompare(b.data))

  return (
    <div className="space-y-6">

      {/* Agenda de Hoje + Esta Semana */}
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

      {/* Próximos compromissos */}
      {proximosCompromissos.length > 0 && (
        <div>
          <h2
            className="text-xs font-semibold uppercase tracking-wider mb-3"
            style={{ color: 'var(--color-ink-soft)' }}
          >
            Próximos compromissos
          </h2>
          <div className="space-y-2">
            {proximosCompromissos.map((a) => (
              <div
                key={a.id}
                className="flex items-center gap-3 rounded-xl px-4 py-3"
                style={{
                  background: 'var(--color-warm-white)',
                  border: '1px solid var(--color-border)',
                }}
              >
                <div
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: 'var(--color-sage-soft)' }}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate" style={{ color: 'var(--color-ink)' }}>
                    {tipoLabel[a.tipo] ?? a.tipo}
                    {a.paciente?.nome && (
                      <span style={{ color: 'var(--color-ink-soft)', fontWeight: 400 }}>
                        {' · '}{a.paciente.nome}
                      </span>
                    )}
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: 'var(--color-ink-soft)' }}>
                    {new Date(a.data_hora).toLocaleDateString('pt-BR', {
                      weekday: 'long', day: '2-digit', month: 'long',
                    })} · {new Date(a.data_hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                <div className="text-xs flex-shrink-0" style={{ color: 'var(--color-ink-faint)' }}>
                  {a.duracao_minutos} min
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Altas recentes */}
      {pacientesComAlta.length > 0 && (
        <div>
          <h2
            className="text-xs font-semibold uppercase tracking-wider mb-3"
            style={{ color: 'var(--color-ink-soft)' }}
          >
            Altas recentes
          </h2>
          <Card>
            <ul className="space-y-2">
              {pacientesComAlta.slice(0, 5).map((p: any) => (
                <li key={p.id} className="text-sm" style={{ color: 'var(--color-ink-mid)' }}>
                  <a href={`/terapia/paciente/${p.id}`} className="font-medium hover:underline" style={{ color: 'var(--color-ink)' }}>
                    {p.nome}
                  </a>
                  <span className="ml-2 text-xs px-2 py-0.5 rounded-full" style={{ background: '#EFF6FF', color: '#1D4ED8' }}>
                    Alta
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}

      {/* Meus pacientes */}
      <div>
        <h2
          className="text-xs font-semibold uppercase tracking-wider mb-3"
          style={{ color: 'var(--color-ink-soft)' }}
        >
          Meus pacientes
        </h2>
        {pacientesAtivos.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {pacientesAtivos.map((p: any) => (
              <a key={p.paciente_id} href={`/terapia/paciente/${p.paciente_id}`}>
                <Card className="hover:shadow-md transition-all duration-200 cursor-pointer group">
                  <div className="font-medium" style={{ color: 'var(--color-ink)' }}>
                    {p.pacientes?.nome}
                  </div>
                  {p.pacientes?.frequencia_atendimento && (
                    <div className="text-xs mt-1" style={{ color: 'var(--color-ink-soft)' }}>
                      {p.pacientes.frequencia_atendimento}
                    </div>
                  )}
                  <div
                    className="text-xs mt-2 font-medium group-hover:underline"
                    style={{ color: 'var(--color-sage-main)' }}
                  >
                    Ver perfil →
                  </div>
                </Card>
              </a>
            ))}
          </div>
        ) : (
          <Card>
            <p className="text-sm" style={{ color: 'var(--color-ink-faint)' }}>
              Nenhum paciente ativo vinculado.
            </p>
          </Card>
        )}
      </div>

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

      {/* Comunicados */}
      {(comunicados ?? []).length > 0 && (
        <div>
          <h2
            className="text-xs font-semibold uppercase tracking-wider mb-3"
            style={{ color: 'var(--color-ink-soft)' }}
          >
            Comunicados da clínica
          </h2>
          <div className="space-y-3">
            {(comunicados ?? []).map((c: any) => (
              <ComunicadoCard
                key={c.id}
                titulo={c.titulo}
                conteudo={c.conteudo}
                criado_em={c.criado_em}
              />
            ))}
          </div>
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

    </div>
  )
}
