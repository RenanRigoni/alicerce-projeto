'use client'

import { useState } from 'react'
import { gerarSessoes } from '@/lib/agenda/sessoes'

interface Paciente {
  id: string
  nome: string
  horarios_atendimento: Array<{ dia: string; hora: string }>
}

interface Props {
  pacientes: Paciente[]
  feriadosDatas: string[]
}

const DIAS_PT = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado']

function getMondayOfWeek(offset: number): Date {
  const hoje = new Date()
  const dow = hoje.getDay()
  const diasAteLunes = dow === 0 ? -6 : 1 - dow
  const monday = new Date(hoje)
  monday.setDate(hoje.getDate() + diasAteLunes + offset * 7)
  monday.setHours(0, 0, 0, 0)
  return monday
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function AgendaSemanalTerapeuta({ pacientes, feriadosDatas }: Props) {
  const [weekOffset, setWeekOffset] = useState(0)

  const monday = getMondayOfWeek(weekOffset)
  const sunday = addDays(monday, 6)
  sunday.setHours(23, 59, 59, 999)

  const sessoes = gerarSessoes(pacientes, monday, sunday, feriadosDatas)

  // Agrupa por data
  const porDia: Record<string, typeof sessoes> = {}
  for (const s of sessoes) {
    const d = s.data_hora.slice(0, 10)
    if (!porDia[d]) porDia[d] = []
    porDia[d].push(s)
  }
  const diasOrdenados = Object.keys(porDia).sort()

  // Estilo por semana
  const estilo = weekOffset < 0
    ? { bg: '#FEF2F2', border: '#FECACA', cor: '#B91C1C', label: 'Semana anterior' }
    : weekOffset === 0
    ? { bg: 'var(--color-sage-light)', border: 'var(--color-sage-soft)', cor: 'var(--color-sage-deep)', label: 'Semana atual' }
    : { bg: '#EFF6FF', border: '#BFDBFE', cor: '#1D4ED8', label: 'Próxima semana' }

  const semanaLabel = `${monday.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} – ${sunday.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}`

  return (
    <div className="space-y-3">
      {/* Navegação */}
      <div className="flex items-center gap-3 flex-wrap">
        <h2 className="text-base font-semibold" style={{ color: 'var(--color-ink-mid)' }}>
          Agenda semanal
        </h2>
        <div className="flex items-center gap-1 ml-auto">
          <button
            onClick={() => setWeekOffset(w => w - 1)}
            className="px-2 py-1 rounded-lg text-sm transition-opacity hover:opacity-70"
            style={{ color: 'var(--color-ink-soft)', border: '1px solid var(--color-border)' }}
          >
            ←
          </button>
          <button
            onClick={() => setWeekOffset(0)}
            className="px-3 py-1 rounded-lg text-xs font-medium transition-opacity hover:opacity-70"
            style={{ color: estilo.cor, background: estilo.bg, border: `1px solid ${estilo.border}` }}
          >
            {weekOffset === 0 ? 'Esta semana' : estilo.label}
          </button>
          <button
            onClick={() => setWeekOffset(w => w + 1)}
            className="px-2 py-1 rounded-lg text-sm transition-opacity hover:opacity-70"
            style={{ color: 'var(--color-ink-soft)', border: '1px solid var(--color-border)' }}
          >
            →
          </button>
        </div>
      </div>

      <p className="text-xs" style={{ color: 'var(--color-ink-faint)' }}>{semanaLabel}</p>

      {diasOrdenados.length === 0 ? (
        <div
          className="rounded-xl px-4 py-3 text-sm"
          style={{ background: estilo.bg, border: `1px solid ${estilo.border}`, color: estilo.cor }}
        >
          Nenhum atendimento nesta semana.
        </div>
      ) : (
        <div className="space-y-3">
          {diasOrdenados.map(dateStr => {
            const d = new Date(dateStr + 'T12:00:00')
            const sessoesDia = porDia[dateStr]
            return (
              <div key={dateStr}>
                <div
                  className="text-xs font-semibold uppercase tracking-wide mb-1.5"
                  style={{ color: estilo.cor }}
                >
                  {DIAS_PT[d.getDay()]} · {d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                </div>
                <div className="space-y-1">
                  {sessoesDia.map(s => {
                    const hora = new Date(s.data_hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                    return (
                      <div
                        key={s.id}
                        className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm"
                        style={{ background: estilo.bg, border: `1px solid ${estilo.border}` }}
                      >
                        <span className="font-medium tabular-nums flex-shrink-0" style={{ color: estilo.cor }}>
                          {hora}
                        </span>
                        <span style={{ color: 'var(--color-ink)' }}>
                          {s.paciente?.nome ?? s.titulo}
                        </span>
                        <span className="ml-auto text-xs flex-shrink-0" style={{ color: 'var(--color-ink-faint)' }}>
                          {s.duracao_minutos}min
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
