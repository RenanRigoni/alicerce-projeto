import { createClient } from '@/lib/supabase/server'
import { Card } from '@/components/ui/Card'
import { gerarSessoes } from '@/lib/agenda/sessoes'
import { AgendamentosLista, type AgendamentoItem } from '@/components/admin/AgendamentosLista'

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
    { data: confirmacoes },
  ] = await Promise.all([
    supabase
      .from('pacientes')
      .select('id, nome, horarios_atendimento, paciente_terapeutas(terapeuta_id, profiles(nome))')
      .eq('status', 'ativo'),
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
    supabase
      .from('sessao_confirmacoes')
      .select('paciente_id, data_hora, token, status')
      .gte('data_hora', hoje.toISOString())
      .lte('data_hora', em14dias.toISOString()),
  ])

  const feriadosDatas = (feriados ?? []).map((f: any) => f.data)

  const pacientesParaGerar = (pacientesAtivos ?? []).map((p: any) => ({
    id: p.id,
    nome: p.nome,
    horarios_atendimento: p.horarios_atendimento ?? [],
    terapeuta_nome: p.paciente_terapeutas?.[0]?.profiles?.nome ?? null,
  }))

  const sessoesRec = gerarSessoes(pacientesParaGerar, hoje, em14dias, feriadosDatas)

  const terapeutaByPaciente = Object.fromEntries(
    (pacientesAtivos ?? []).map((p: any) => [
      p.id,
      p.paciente_terapeutas?.[0]?.profiles?.nome ?? null,
    ])
  )

  // Mapa de confirmações: "paciente_id_YYYY-MM-DD_HH:MM" → { token, status }
  const confirmacaoMap = new Map<string, { token: string; status: string }>()
  for (const c of confirmacoes ?? []) {
    const dt = new Date(c.data_hora as string)
    const brt = new Date(dt.getTime() - 3 * 60 * 60 * 1000)
    const brtDate = brt.toISOString().slice(0, 10)
    const brtHora = brt.toISOString().slice(11, 16)
    confirmacaoMap.set(`${c.paciente_id}_${brtDate}_${brtHora}`, {
      token: c.token as string,
      status: c.status as string,
    })
  }

  const proximos: AgendamentoItem[] = [
    ...sessoesRec.map(s => {
      const brtDate = s.data_hora.slice(0, 10)
      const brtHora = s.data_hora.slice(11, 16)
      const confirmacao = s.paciente
        ? (confirmacaoMap.get(`${s.paciente.id}_${brtDate}_${brtHora}`) ?? null)
        : null
      return {
        id: s.id,
        tipo: s.tipo,
        titulo: s.titulo,
        motivo: null,
        data_hora: s.data_hora,
        duracao_minutos: s.duracao_minutos,
        pacienteId: s.paciente?.id ?? null,
        pacienteNome: s.paciente?.nome ?? null,
        terapeutaNome: s.paciente ? terapeutaByPaciente[s.paciente.id] : null,
        visivel_responsavel: true,
        confirmacao,
      }
    }),
    ...(especiais ?? []).map((a: any) => ({
      id: a.id,
      tipo: a.tipo,
      titulo: a.titulo,
      motivo: a.motivo,
      data_hora: a.data_hora,
      duracao_minutos: a.duracao_minutos,
      pacienteId: a.pacientes?.id ?? null,
      pacienteNome: a.pacientes?.nome ?? null,
      terapeutaNome: (a.profiles as any)?.nome ?? null,
      visivel_responsavel: a.visivel_responsavel,
      confirmacao: null,
    })),
  ].sort((a, b) => a.data_hora.localeCompare(b.data_hora))

  // Agrupa por dia
  const porDia: Record<string, AgendamentoItem[]> = {}
  for (const a of proximos) {
    const dia = a.data_hora.slice(0, 10)
    if (!porDia[dia]) porDia[dia] = []
    porDia[dia].push(a)
  }
  const diasOrdenados = Object.keys(porDia).sort()

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

      {/* Próximos — agrupados por dia (client component com WA inline) */}
      <div className="space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-ink-soft)' }}>
          Próximos (14 dias)
        </h2>
        {diasOrdenados.length > 0 ? (
          <AgendamentosLista porDia={porDia} diasOrdenados={diasOrdenados} />
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
