export interface SessaoGerada {
  id: string
  tipo: 'sessao'
  titulo: string
  motivo: null
  data_hora: string
  duracao_minutos: number
  paciente: { id: string; nome: string } | null
}

const DOW_MAP: Record<string, number> = {
  segunda: 1, terca: 2, quarta: 3, quinta: 4, sexta: 5, sabado: 6,
}

function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function gerarSessoes(
  pacientes: Array<{
    id: string
    nome: string
    horarios_atendimento: Array<{ dia: string; hora: string }>
  }>,
  dataInicio: Date,
  dataFim: Date,
  feriados: string[],
): SessaoGerada[] {
  const ferSet = new Set(feriados)
  const sessoes: SessaoGerada[] = []

  for (const pac of pacientes) {
    if (!pac.horarios_atendimento?.length) continue

    for (const h of pac.horarios_atendimento) {
      const dow = DOW_MAP[h.dia]
      if (dow === undefined) continue

      const curr = new Date(dataInicio)
      // Avança até o dia da semana correto sem alterar horas (evita confusão de timezone)
      const daysToAdd = (dow - curr.getDay() + 7) % 7
      curr.setDate(curr.getDate() + daysToAdd)

      while (curr <= dataFim) {
        const dateStr = localDateStr(curr)
        if (!ferSet.has(dateStr)) {
          // Monta datetime com offset fixo de Brasília (UTC-3) — evita conversão pelo timezone do servidor
          const dataHoraBRT = `${dateStr}T${h.hora}:00-03:00`
          sessoes.push({
            id: `rec-${pac.id}-${dateStr}-${h.hora.replace(':', '')}`,
            tipo: 'sessao',
            titulo: `Sessão — ${pac.nome}`,
            motivo: null,
            data_hora: dataHoraBRT,
            duracao_minutos: 50,
            paciente: { id: pac.id, nome: pac.nome },
          })
        }
        curr.setDate(curr.getDate() + 7)
      }
    }
  }

  return sessoes.sort((a, b) => a.data_hora.localeCompare(b.data_hora))
}
