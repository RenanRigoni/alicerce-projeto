import { createClient } from '@/lib/supabase/server'
import { Card } from '@/components/ui/Card'
import { gerarSessoes } from '@/lib/agenda/sessoes'

const tipoLabel: Record<string, string> = {
  sessao: 'Sessão', devolutiva: 'Devolutiva', reuniao: 'Reunião', outro: 'Outro',
}

const tipoStyle: Record<string, { background: string; color: string }> = {
  sessao:     { background: 'var(--color-rose-blush)',     color: 'var(--color-rose-deep)' },
  devolutiva: { background: 'var(--color-lavender-light)', color: 'var(--color-lavender-main)' },
  reuniao:    { background: 'var(--color-sage-light)',     color: 'var(--color-sage-deep)' },
  outro:      { background: 'var(--color-border-soft)',    color: 'var(--color-ink-mid)' },
}

export default async function AgendamentosPage() {
  const supabase = await createClient()

  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  const em14dias = new Date(hoje.getTime() + 14 * 24 * 60 * 60 * 1000)

  const [
    { data: pacientesAtivos },
    { data: especiais },
    { data: passados },
    { data: feriados },
  ] = await Promise.all([
    // Todos pacientes ativos com horários e terapeuta vinculado
    supabase
      .from('pacientes')
      .select('id, nome, horarios_atendimento, paciente_terapeutas(terapeuta_id, profiles(nome))')
      .eq('status', 'ativo'),
    // Eventos excepcionais futuros (devolutivas, reuniões, etc)
    supabase
      .from('agendamentos')
      .select(`
        id, tipo, titulo, motivo, data_hora, duracao_minutos, visivel_responsavel,
        pacientes(id, nome),
        profiles!agendamentos_terapeuta_id_fkey(nome)
      `)
      .neq('tipo', 'sessao')
      .gte('data_hora', hoje.toISOString())
      .order('data_hora')
      .limit(50),
    // Histórico recente (todos os tipos, já passados)
    supabase
      .from('agendamentos')
      .select(`
        id, tipo, titulo, data_hora,
        pacientes(nome),
        profiles!agendamentos_terapeuta_id_fkey(nome)
      `)
      .lt('data_hora', hoje.toISOString())
      .order('data_hora', { ascending: false })
      .limit(20),
    supabase
      .from('feriados')
      .select('data')
      .gte('data', hoje.toISOString().slice(0, 10))
      .lte('data', em14dias.toISOString().slice(0, 10)),
  ])

  const feriadosDatas = (feriados ?? []).map((f: any) => f.data)

  // Gera sessões recorrentes para os próximos 14 dias
  const pacientesParaGerar = (pacientesAtivos ?? []).map((p: any) => ({
    id: p.id,
    nome: p.nome,
    horarios_atendimento: p.horarios_atendimento ?? [],
    terapeuta_nome: p.paciente_terapeutas?.[0]?.profiles?.nome ?? null,
  }))

  const sessoesRec = gerarSessoes(pacientesParaGerar, hoje, em14dias, feriadosDatas)

  // Enriquece sessões com nome do terapeuta
  const terapeutaByPaciente = Object.fromEntries(
    (pacientesAtivos ?? []).map((p: any) => [
      p.id,
      p.paciente_terapeutas?.[0]?.profiles?.nome ?? null,
    ])
  )

  // Merge sessões + especiais, ordena por data
  const proximos = [
    ...sessoesRec.map(s => ({
      id: s.id,
      tipo: s.tipo,
      titulo: s.titulo,
      motivo: null,
      data_hora: s.data_hora,
      duracao_minutos: s.duracao_minutos,
      visivel_responsavel: true,
      pacienteNome: s.paciente?.nome ?? null,
      terapeutaNome: s.paciente ? terapeutaByPaciente[s.paciente.id] : null,
    })),
    ...(especiais ?? []).map((a: any) => ({
      id: a.id,
      tipo: a.tipo,
      titulo: a.titulo,
      motivo: a.motivo,
      data_hora: a.data_hora,
      duracao_minutos: a.duracao_minutos,
      visivel_responsavel: a.visivel_responsavel,
      pacienteNome: a.pacientes?.nome ?? null,
      terapeutaNome: (a.profiles as any)?.nome ?? null,
    })),
  ].sort((a, b) => a.data_hora.localeCompare(b.data_hora))

  const DIAS_PT = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado']

  // Agrupa próximos por dia
  const porDia: Record<string, typeof proximos> = {}
  for (const a of proximos) {
    const dia = a.data_hora.slice(0, 10)
    if (!porDia[dia]) porDia[dia] = []
    porDia[dia].push(a)
  }
  const diasOrdenados = Object.keys(porDia).sort()

  function formatarHora(iso: string) {
    return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  }

  function formatarCabecalhoDia(dateStr: string) {
    const d = new Date(dateStr + 'T12:00:00')
    const diaSemana = DIAS_PT[d.getDay()]
    const data = d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
    return `${diaSemana} · ${data}`
  }

  function formatarDataHora(iso: string) {
    const d = new Date(iso)
    return d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })
      + ' · ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-2xl font-semibold"
            style={{ fontFamily: 'var(--font-lora)', color: 'var(--color-ink)' }}
          >
            Agendamentos
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-ink-soft)' }}>
            Sessões e compromissos — próximos 14 dias
          </p>
        </div>
        <a
          href="/admin/agendamentos/novo"
          className="text-sm font-medium px-4 py-2 rounded-xl text-white transition-all duration-200 active:scale-[0.98]"
          style={{ background: 'var(--color-rose-main)' }}
        >
          + Novo agendamento
        </a>
      </div>

      {/* Próximos — agrupados por dia */}
      <div className="space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-ink-soft)' }}>
          Próximos (14 dias)
        </h2>
        {diasOrdenados.length > 0 ? (
          <div className="space-y-4">
            {diasOrdenados.map(dateStr => (
              <div key={dateStr}>
                <div
                  className="text-xs font-semibold uppercase tracking-wide mb-2"
                  style={{ color: 'var(--color-rose-main)' }}
                >
                  {formatarCabecalhoDia(dateStr)}
                </div>
                <div
                  className="rounded-2xl overflow-hidden"
                  style={{ background: 'var(--color-warm-white)', border: '1px solid var(--color-border)' }}
                >
                  {porDia[dateStr].map((a, i) => (
                    <div
                      key={a.id}
                      className="px-4 py-3 flex items-start justify-between gap-3"
                      style={{ borderTop: i > 0 ? '1px solid var(--color-border-soft)' : 'none' }}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                          <span
                            className="text-xs px-2 py-0.5 rounded-full font-medium"
                            style={tipoStyle[a.tipo] ?? tipoStyle.outro}
                          >
                            {tipoLabel[a.tipo] ?? a.tipo}
                          </span>
                          <span className="text-sm font-medium truncate" style={{ color: 'var(--color-ink)' }}>
                            {a.titulo}
                          </span>
                        </div>
                        <div className="text-xs" style={{ color: 'var(--color-ink-soft)' }}>
                          {a.pacienteNome && <span>{a.pacienteNome} · </span>}
                          {a.terapeutaNome}
                        </div>
                        {a.motivo && (
                          <div className="text-xs italic mt-0.5" style={{ color: 'var(--color-ink-faint)' }}>
                            {a.motivo}
                          </div>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-sm font-medium tabular-nums" style={{ color: 'var(--color-ink-mid)' }}>
                          {formatarHora(a.data_hora)}
                        </div>
                        <div className="text-xs" style={{ color: 'var(--color-ink-faint)' }}>
                          {a.duracao_minutos} min
                        </div>
                        {!a.visivel_responsavel && (
                          <div className="text-xs" style={{ color: 'var(--color-ink-faint)' }}>Interno</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Card>
            <p className="text-sm" style={{ color: 'var(--color-ink-faint)' }}>
              Nenhum agendamento nos próximos 14 dias.
            </p>
          </Card>
        )}
      </div>

      {/* Histórico recente */}
      {passados && passados.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-ink-soft)' }}>
            Histórico recente
          </h2>
          <div
            className="rounded-2xl overflow-hidden"
            style={{ background: 'var(--color-warm-white)', border: '1px solid var(--color-border)' }}
          >
            {passados.map((a: any, i: number) => (
              <div
                key={a.id}
                className="px-4 py-2.5 flex items-center justify-between gap-3"
                style={{ borderTop: i > 0 ? '1px solid var(--color-border-soft)' : 'none' }}
              >
                <div className="flex-1 min-w-0">
                  <span className="text-sm truncate" style={{ color: 'var(--color-ink-mid)' }}>
                    {a.pacientes?.nome && `${a.pacientes.nome} — `}
                    {a.titulo}
                  </span>
                  <div className="text-xs" style={{ color: 'var(--color-ink-faint)' }}>
                    {(a.profiles as any)?.nome}
                  </div>
                </div>
                <div className="text-xs flex-shrink-0" style={{ color: 'var(--color-ink-faint)' }}>
                  {formatarDataHora(a.data_hora)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
