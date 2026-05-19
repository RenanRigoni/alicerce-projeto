import { gerarSessoes } from './sessoes'

export interface PacienteAgendaBloqueio {
  id: string
  nome: string
  status?: string | null
  horarios_atendimento?: Array<{ dia: string; hora: string }> | null
}

export interface AgendamentoOcupado {
  id: string
  tipo: string
  titulo: string
  motivo?: string | null
  data_hora: string
  duracao_minutos?: number | null
  paciente_id?: string | null
  pacientes?: { id: string; nome: string } | null
}

export interface ConfirmacaoSessaoAgenda {
  paciente_id: string
  data_hora: string
  status: string
}

export interface HorarioFuncionamentoAgenda {
  dia_semana: number
  hora_inicio: string
  hora_fim: string
}

export interface ConflitoBloqueio {
  id: string
  origem: 'recorrente' | 'agendamento'
  tipo: string
  titulo: string
  data_hora: string
  duracao_minutos: number
  pacienteId: string | null
  pacienteNome: string | null
}

export interface SugestaoReposicao {
  data_hora: string
  duracao_minutos: number
}

const DEFAULT_HORARIOS: HorarioFuncionamentoAgenda[] = [
  { dia_semana: 1, hora_inicio: '08:00', hora_fim: '18:00' },
  { dia_semana: 2, hora_inicio: '08:00', hora_fim: '18:00' },
  { dia_semana: 3, hora_inicio: '08:00', hora_fim: '18:00' },
  { dia_semana: 4, hora_inicio: '08:00', hora_fim: '18:00' },
  { dia_semana: 5, hora_inicio: '08:00', hora_fim: '18:00' },
]

export function inicioDiaBRT(iso: string | Date): Date {
  return new Date(`${dataBRT(iso)}T00:00:00-03:00`)
}

export function fimDiaBRT(iso: string | Date): Date {
  return new Date(`${dataBRT(iso)}T23:59:59-03:00`)
}

export function dataBRT(iso: string | Date): string {
  const dt = typeof iso === 'string' ? new Date(iso) : iso
  const brt = new Date(dt.getTime() - 3 * 60 * 60 * 1000)
  return brt.toISOString().slice(0, 10)
}

export function horaBRT(iso: string | Date): string {
  const dt = typeof iso === 'string' ? new Date(iso) : iso
  const brt = new Date(dt.getTime() - 3 * 60 * 60 * 1000)
  return brt.toISOString().slice(11, 16)
}

export function intervalosSobrepostos(
  inicioA: string | Date,
  duracaoA: number,
  inicioB: string | Date,
  duracaoB: number,
) {
  const aStart = typeof inicioA === 'string' ? new Date(inicioA).getTime() : inicioA.getTime()
  const bStart = typeof inicioB === 'string' ? new Date(inicioB).getTime() : inicioB.getTime()
  const aEnd = aStart + duracaoA * 60 * 1000
  const bEnd = bStart + duracaoB * 60 * 1000
  return aStart < bEnd && bStart < aEnd
}

export function chaveConfirmacao(pacienteId: string, dataHora: string) {
  return `${pacienteId}|${new Date(dataHora).toISOString()}`
}

export function encontrarConflitosBloqueio({
  pacientes,
  agendamentos,
  confirmacoes,
  feriadosDatas,
  dataHora,
  duracaoMinutos,
}: {
  pacientes: PacienteAgendaBloqueio[]
  agendamentos: AgendamentoOcupado[]
  confirmacoes: ConfirmacaoSessaoAgenda[]
  feriadosDatas: string[]
  dataHora: string
  duracaoMinutos: number
}): ConflitoBloqueio[] {
  const inicio = new Date(dataHora)
  const fim = new Date(inicio.getTime() + duracaoMinutos * 60 * 1000)
  const canceladas = new Set(
    confirmacoes
      .filter(c => c.status === 'cancelada')
      .map(c => chaveConfirmacao(c.paciente_id, c.data_hora)),
  )

  const sessoes = gerarSessoes(
    pacientes
      .filter(p => !p.status || p.status === 'ativo')
      .map(p => ({
        id: p.id,
        nome: p.nome,
        horarios_atendimento: p.horarios_atendimento ?? [],
      })),
    inicioDiaBRT(inicio),
    fimDiaBRT(fim),
    feriadosDatas,
  )

  const conflitosRecorrentes = sessoes
    .filter(s => {
      if (!s.paciente) return false
      if (canceladas.has(chaveConfirmacao(s.paciente.id, s.data_hora))) return false
      return intervalosSobrepostos(dataHora, duracaoMinutos, s.data_hora, s.duracao_minutos)
    })
    .map(s => ({
      id: s.id,
      origem: 'recorrente' as const,
      tipo: 'sessao',
      titulo: s.titulo,
      data_hora: s.data_hora,
      duracao_minutos: s.duracao_minutos,
      pacienteId: s.paciente?.id ?? null,
      pacienteNome: s.paciente?.nome ?? null,
    }))

  const conflitosManuais = agendamentos
    .filter(a => a.tipo !== 'bloqueio')
    .filter(a => intervalosSobrepostos(dataHora, duracaoMinutos, a.data_hora, a.duracao_minutos ?? 50))
    .map(a => ({
      id: a.id,
      origem: 'agendamento' as const,
      tipo: a.tipo,
      titulo: a.titulo,
      data_hora: a.data_hora,
      duracao_minutos: a.duracao_minutos ?? 50,
      pacienteId: a.paciente_id ?? a.pacientes?.id ?? null,
      pacienteNome: a.pacientes?.nome ?? null,
    }))

  return [...conflitosRecorrentes, ...conflitosManuais]
    .sort((a, b) => new Date(a.data_hora).getTime() - new Date(b.data_hora).getTime())
}

export function gerarSugestoesReposicao({
  pacientes,
  agendamentos,
  confirmacoes,
  feriadosDatas,
  horariosFuncionamento,
  intervaloAgenda,
  conflito,
  bloqueio,
  limite = 12,
}: {
  pacientes: PacienteAgendaBloqueio[]
  agendamentos: AgendamentoOcupado[]
  confirmacoes: ConfirmacaoSessaoAgenda[]
  feriadosDatas: string[]
  horariosFuncionamento: HorarioFuncionamentoAgenda[]
  intervaloAgenda: number
  conflito: ConflitoBloqueio
  bloqueio: { data_hora: string; duracao_minutos: number }
  limite?: number
}): SugestaoReposicao[] {
  const agora = new Date()
  const fimBusca = new Date(agora.getTime() + 45 * 24 * 60 * 60 * 1000)
  const canceladas = new Set(
    confirmacoes
      .filter(c => c.status === 'cancelada')
      .map(c => chaveConfirmacao(c.paciente_id, c.data_hora)),
  )

  const sessoes = gerarSessoes(
    pacientes
      .filter(p => !p.status || p.status === 'ativo')
      .map(p => ({
        id: p.id,
        nome: p.nome,
        horarios_atendimento: p.horarios_atendimento ?? [],
      })),
    inicioDiaBRT(agora),
    fimDiaBRT(fimBusca),
    feriadosDatas,
  ).filter(s => {
    if (!s.paciente) return true
    return !canceladas.has(chaveConfirmacao(s.paciente.id, s.data_hora))
  })

  const ocupados = [
    ...sessoes.map(s => ({ data_hora: s.data_hora, duracao_minutos: s.duracao_minutos })),
    ...agendamentos.map(a => ({ data_hora: a.data_hora, duracao_minutos: a.duracao_minutos ?? 50 })),
    bloqueio,
  ]

  const horarios = horariosFuncionamento.length > 0 ? horariosFuncionamento : DEFAULT_HORARIOS
  const horariosPorDia = new Map<number, HorarioFuncionamentoAgenda[]>()
  for (const h of horarios) {
    const lista = horariosPorDia.get(h.dia_semana) ?? []
    lista.push(h)
    horariosPorDia.set(h.dia_semana, lista)
  }

  const sugestoes: SugestaoReposicao[] = []
  const passo = Math.max(15, intervaloAgenda || conflito.duracao_minutos || 50)
  const duracao = Math.max(15, conflito.duracao_minutos || 50)
  const feriadosSet = new Set(feriadosDatas)

  for (let cursor = inicioDiaBRT(agora); cursor <= fimBusca && sugestoes.length < limite; cursor.setDate(cursor.getDate() + 1)) {
    const data = dataBRT(cursor)
    if (feriadosSet.has(data)) continue

    const faixas = horariosPorDia.get(cursor.getUTCDay()) ?? []
    for (const faixa of faixas) {
      const inicioFaixa = new Date(`${data}T${normalizarHora(faixa.hora_inicio)}:00-03:00`)
      const fimFaixa = new Date(`${data}T${normalizarHora(faixa.hora_fim)}:00-03:00`)

      for (
        let slot = new Date(inicioFaixa);
        slot.getTime() + duracao * 60 * 1000 <= fimFaixa.getTime() && sugestoes.length < limite;
        slot = new Date(slot.getTime() + passo * 60 * 1000)
      ) {
        if (slot <= agora) continue
        const ocupado = ocupados.some(o => intervalosSobrepostos(slot, duracao, o.data_hora, o.duracao_minutos))
        if (!ocupado) {
          sugestoes.push({
            data_hora: slot.toISOString(),
            duracao_minutos: duracao,
          })
        }
      }
    }
  }

  return sugestoes
}

function normalizarHora(value: string) {
  return value.slice(0, 5)
}
