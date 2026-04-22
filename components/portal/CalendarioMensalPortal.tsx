'use client'

import { useState } from 'react'

interface EventoCalendario {
  id: string
  data: string
  hora: string
  titulo: string
  tipo: 'sessao' | 'agendamento' | 'feriado'
  descricao?: string
}

interface Props {
  eventos: EventoCalendario[]
}

const diasSemana = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
const mesesPT = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

const tipoStyle: Record<string, { bg: string; cor: string; borda: string }> = {
  sessao:      { bg: 'var(--color-sage-light)',     cor: 'var(--color-sage-deep)',     borda: 'var(--color-sage-soft)' },
  agendamento: { bg: 'var(--color-peach-light)',    cor: 'var(--color-peach-main)',    borda: 'var(--color-peach-soft, #F5C5A3)' },
  feriado:     { bg: '#FEF9F0',                     cor: '#92400E',                    borda: '#FDEBD0' },
}

function localStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function isToday(d: Date) { return localStr(d) === localStr(new Date()) }

export function CalendarioMensalPortal({ eventos }: Props) {
  const [mesBase, setMesBase] = useState(() => {
    const hoje = new Date()
    return new Date(hoje.getFullYear(), hoje.getMonth(), 1)
  })
  const [selecionado, setSelecionado] = useState<{ data: string; evs: EventoCalendario[] } | null>(null)

  const ano = mesBase.getFullYear()
  const mes = mesBase.getMonth()
  const primeiroDow = mesBase.getDay() // 0=Dom
  const offset = primeiroDow === 0 ? 6 : primeiroDow - 1
  const diasNoMes = new Date(ano, mes + 1, 0).getDate()
  const totalCells = Math.ceil((offset + diasNoMes) / 7) * 7

  const cells: (Date | null)[] = Array.from({ length: totalCells }, (_, i) => {
    const n = i - offset + 1
    if (n < 1 || n > diasNoMes) return null
    return new Date(ano, mes, n)
  })

  const eventosParaDia = (d: Date) => eventos.filter(e => e.data === localStr(d))

  const mesLabel = `${mesesPT[mes]} ${ano}`

  return (
    <div className="space-y-3">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold" style={{ color: 'var(--color-ink-mid)' }}>
          Calendário
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMesBase(new Date(ano, mes - 1, 1))}
            className="px-2 py-1 text-sm rounded-lg transition-opacity hover:opacity-70"
            style={{ color: 'var(--color-ink-soft)', border: '1px solid var(--color-border)' }}
          >
            ←
          </button>
          <span className="text-sm font-medium min-w-[140px] text-center" style={{ color: 'var(--color-ink-mid)' }}>
            {mesLabel}
          </span>
          <button
            onClick={() => setMesBase(new Date(ano, mes + 1, 1))}
            className="px-2 py-1 text-sm rounded-lg transition-opacity hover:opacity-70"
            style={{ color: 'var(--color-ink-soft)', border: '1px solid var(--color-border)' }}
          >
            →
          </button>
        </div>
      </div>

      {/* Grade */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ border: '1px solid var(--color-border)' }}
      >
        {/* Cabeçalho dias semana */}
        <div className="grid grid-cols-7" style={{ background: 'var(--color-canvas)' }}>
          {diasSemana.map(d => (
            <div key={d} className="text-center text-xs font-medium py-2" style={{ color: 'var(--color-ink-faint)' }}>
              {d}
            </div>
          ))}
        </div>

        {/* Células */}
        <div className="grid grid-cols-7" style={{ gap: '1px', background: 'var(--color-border-soft)' }}>
          {cells.map((day, i) => {
            if (!day) return (
              <div key={i} className="min-h-[3.5rem]" style={{ background: 'var(--color-canvas)' }} />
            )
            const evs = eventosParaDia(day)
            const hoje = isToday(day)
            const isDomingo = day.getDay() === 0

            return (
              <button
                key={i}
                onClick={() => evs.length > 0 ? setSelecionado({ data: localStr(day), evs }) : undefined}
                className="min-h-[3.5rem] p-1.5 text-left transition-all"
                style={{
                  background: hoje
                    ? 'rgba(134,176,145,0.18)'
                    : isDomingo
                    ? 'var(--color-canvas)'
                    : 'var(--color-warm-white)',
                  border: hoje ? '1.5px solid var(--color-sage-soft)' : 'none',
                  cursor: evs.length > 0 ? 'pointer' : 'default',
                }}
              >
                <div
                  className="text-xs font-bold mb-1"
                  style={{
                    color: hoje
                      ? 'var(--color-sage-deep)'
                      : isDomingo
                      ? 'var(--color-border)'
                      : 'var(--color-ink-soft)',
                  }}
                >
                  {day.getDate()}
                </div>
                <div className="space-y-0.5">
                  {evs.slice(0, 2).map((ev, idx) => {
                    const s = tipoStyle[ev.tipo] ?? tipoStyle.agendamento
                    return (
                      <div
                        key={idx}
                        className="text-xs px-1 rounded truncate"
                        style={{ background: s.bg, color: s.cor }}
                      >
                        {ev.hora && <span className="mr-1">{ev.hora}</span>}
                        {ev.titulo}
                      </div>
                    )
                  })}
                  {evs.length > 2 && (
                    <div className="text-xs" style={{ color: 'var(--color-ink-faint)' }}>
                      +{evs.length - 2} mais
                    </div>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Legenda */}
      <div className="flex items-center gap-4 flex-wrap">
        {Object.entries({ sessao: 'Sessão', agendamento: 'Compromisso', feriado: 'Feriado' }).map(([tipo, label]) => (
          <div key={tipo} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: tipoStyle[tipo].bg, border: `1px solid ${tipoStyle[tipo].borda}` }} />
            <span className="text-xs" style={{ color: 'var(--color-ink-soft)' }}>{label}</span>
          </div>
        ))}
      </div>

      {/* Modal do dia */}
      {selecionado && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 p-4"
          style={{ background: 'rgba(44,32,24,0.35)' }}
          onClick={() => setSelecionado(null)}
        >
          <div
            className="rounded-2xl p-5 max-w-sm w-full space-y-3 max-h-[80vh] overflow-y-auto"
            style={{ background: 'var(--color-warm-white)', boxShadow: '0 20px 60px rgba(44,32,24,0.2)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-semibold" style={{ color: 'var(--color-ink)' }}>
                {new Date(selecionado.data + 'T12:00:00').toLocaleDateString('pt-BR', {
                  weekday: 'long', day: '2-digit', month: 'long',
                })}
              </h3>
              <button onClick={() => setSelecionado(null)} className="text-lg hover:opacity-60" style={{ color: 'var(--color-ink-faint)' }}>×</button>
            </div>
            <div className="space-y-2">
              {selecionado.evs.map((ev, idx) => {
                const s = tipoStyle[ev.tipo] ?? tipoStyle.agendamento
                return (
                  <div
                    key={idx}
                    className="rounded-xl px-3 py-2"
                    style={{ background: s.bg, border: `1px solid ${s.borda}` }}
                  >
                    <div className="text-sm font-medium" style={{ color: s.cor }}>
                      {ev.hora && <span className="mr-2">{ev.hora}</span>}
                      {ev.titulo}
                    </div>
                    {ev.descricao && (
                      <div className="text-xs mt-0.5" style={{ color: 'var(--color-ink-soft)' }}>{ev.descricao}</div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
