'use client'

import { useState, useEffect } from 'react'

export interface EventoAgenda {
  id: string
  tipo: string
  titulo: string
  motivo: string | null
  data_hora: string
  duracao_minutos: number
  paciente: { id: string; nome: string } | null
  confirmacao?: { token: string; status: string } | null
}

interface Feriado {
  data: string
  descricao: string
}

interface Props {
  eventos: EventoAgenda[]
  feriados: Feriado[]
}

const tipoStyle: Record<string, { background: string; color: string; border: string }> = {
  sessao:     { background: 'var(--color-rose-blush)',    color: 'var(--color-rose-deep)',     border: 'var(--color-rose-soft)' },
  devolutiva: { background: 'var(--color-lavender-light)', color: 'var(--color-lavender-main)', border: 'var(--color-lavender-soft)' },
  reuniao:    { background: '#EFF6FF',    color: '#1D4ED8',     border: '#BFDBFE' },
  outro:      { background: 'var(--color-border-soft)',   color: 'var(--color-ink-mid)',       border: 'var(--color-border)' },
}

const tipoLabel: Record<string, string> = {
  sessao: 'Sessão', devolutiva: 'Devolutiva', reuniao: 'Reunião', outro: 'Outro',
}

const confirmacaoConfig: Record<string, { label: string; bg: string; color: string; border: string }> = {
  pendente:   { label: '⏳ Aguardando confirmação', bg: '#fffbeb', color: '#b45309', border: '#fde68a' },
  confirmada: { label: '✅ Confirmada pelo responsável', bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
  cancelada:  { label: '❌ Cancelada pelo responsável', bg: '#fef2f2', color: '#dc2626', border: '#fecaca' },
  expirada:   { label: '⚠️ Expirada — confirmada para cobrança', bg: '#f3f4f6', color: '#6b7280', border: '#e5e7eb' },
}

const diasCurtos = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

function getMondayOfWeek(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

function localDateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function isToday(d: Date): boolean {
  return localDateStr(d) === localDateStr(new Date())
}

function getEventosForDate(date: Date, eventos: EventoAgenda[]): EventoAgenda[] {
  const local = localDateStr(date)
  return eventos
    .filter(e => localDateStr(new Date(e.data_hora)) === local)
    .sort((a, b) => a.data_hora.localeCompare(b.data_hora))
}

function getFeriadoForDate(date: Date, feriados: Feriado[]): Feriado | undefined {
  return feriados.find(f => f.data === localDateStr(date))
}

function horaEvento(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function IconeWhatsApp() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 00-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  )
}

export function CalendarioAgenda({ eventos, feriados }: Props) {
  const [view, setView] = useState<'semana' | 'mes'>('semana')
  const [dataBase, setDataBase] = useState(new Date())
  const [eventoAberto, setEventoAberto] = useState<EventoAgenda | null>(null)
  const [diaAberto, setDiaAberto] = useState<{ dateStr: string; evs: EventoAgenda[] } | null>(null)
  const [waLoading, setWaLoading] = useState(false)
  const [waConfirmacao, setWaConfirmacao] = useState<{ token: string; status: string } | null>(null)

  useEffect(() => {
    setWaConfirmacao(null)
    setWaLoading(false)
  }, [eventoAberto?.id])

  async function handleEnviarWhatsApp() {
    if (!eventoAberto?.paciente) return
    setWaLoading(true)
    try {
      const res = await fetch('/api/sessao/confirmacao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paciente_id: eventoAberto.paciente.id,
          data_hora: eventoAberto.data_hora,
        }),
      })
      const json = await res.json()
      if (res.ok && json.waUrl) {
        window.open(json.waUrl, '_blank', 'noopener,noreferrer')
        setWaConfirmacao({ token: json.token, status: json.status ?? 'pendente' })
      }
    } catch {
      // silent — usuário pode tentar novamente
    } finally {
      setWaLoading(false)
    }
  }

  const confirmacaoStatus =
    waConfirmacao?.status ?? eventoAberto?.confirmacao?.status ?? null

  const podaEnviarWA =
    confirmacaoStatus === null ||
    confirmacaoStatus === 'cancelada' ||
    confirmacaoStatus === 'expirada' ||
    confirmacaoStatus === 'pendente'

  // ── SEMANA ──────────────────────────────────────────────────
  const monday = getMondayOfWeek(dataBase)
  const weekDays = Array.from({ length: 6 }, (_, i) => addDays(monday, i))

  const prevSemana = () => setDataBase(d => addDays(d, -7))
  const nextSemana = () => setDataBase(d => addDays(d, 7))

  const semanaLabel = (() => {
    const sat = weekDays[5]
    const opts: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short' }
    return `${monday.toLocaleDateString('pt-BR', opts)} – ${sat.toLocaleDateString('pt-BR', opts)} ${monday.getFullYear()}`
  })()

  // ── MÊS ─────────────────────────────────────────────────────
  const mesAno = new Date(dataBase.getFullYear(), dataBase.getMonth(), 1)
  const prevMes = () => setDataBase(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))
  const nextMes = () => setDataBase(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))
  const mesLabel = mesAno.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

  const firstDow = mesAno.getDay()
  const daysInMonth = new Date(mesAno.getFullYear(), mesAno.getMonth() + 1, 0).getDate()
  const offset = firstDow === 0 ? 6 : firstDow - 1
  const totalCells = Math.ceil((offset + daysInMonth) / 7) * 7
  const calDays: (Date | null)[] = Array.from({ length: totalCells }, (_, i) => {
    const dayNum = i - offset + 1
    if (dayNum < 1 || dayNum > daysInMonth) return null
    return new Date(mesAno.getFullYear(), mesAno.getMonth(), dayNum)
  })

  return (
    <div className="space-y-4">
      {/* Controles */}
      <div className="flex items-center gap-3 flex-wrap">
        <div
          className="flex rounded-xl overflow-hidden"
          style={{ border: '1px solid var(--color-border)' }}
        >
          <button
            onClick={() => setView('semana')}
            className="px-4 py-1.5 text-sm font-medium transition-colors"
            style={view === 'semana'
              ? { background: 'var(--color-rose-main)', color: '#fff' }
              : { color: 'var(--color-ink-mid)', background: 'transparent' }
            }
          >
            Semana
          </button>
          <button
            onClick={() => setView('mes')}
            className="px-4 py-1.5 text-sm font-medium transition-colors"
            style={view === 'mes'
              ? { background: 'var(--color-rose-main)', color: '#fff' }
              : { color: 'var(--color-ink-mid)', background: 'transparent' }
            }
          >
            Mês
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={view === 'semana' ? prevSemana : prevMes}
            className="px-2 py-1 transition-opacity hover:opacity-70"
            style={{ color: 'var(--color-ink-soft)' }}
          >
            ←
          </button>
          <span
            className="text-sm font-medium capitalize min-w-[200px] text-center"
            style={{ color: 'var(--color-ink-mid)' }}
          >
            {view === 'semana' ? semanaLabel : mesLabel}
          </span>
          <button
            onClick={view === 'semana' ? nextSemana : nextMes}
            className="px-2 py-1 transition-opacity hover:opacity-70"
            style={{ color: 'var(--color-ink-soft)' }}
          >
            →
          </button>
        </div>

        <button
          onClick={() => setDataBase(new Date())}
          className="text-xs font-medium px-3 py-1.5 rounded-xl transition-opacity hover:opacity-80"
          style={{
            color: 'var(--color-rose-main)',
            border: '1px solid var(--color-rose-soft)',
          }}
        >
          Hoje
        </button>
      </div>

      {/* ── Vista Semanal ── */}
      {view === 'semana' && (
        <div className="grid grid-cols-6 gap-2">
          {weekDays.map((day, i) => {
            const evs = getEventosForDate(day, eventos)
            const feriado = getFeriadoForDate(day, feriados)
            const hoje = isToday(day)
            return (
              <div
                key={i}
                className="rounded-xl p-2 min-h-[140px]"
                style={{
                  border: hoje
                    ? '1px solid #BFDBFE'
                    : feriado
                    ? '1px solid #FECACA'
                    : '1px solid var(--color-border-soft)',
                  background: hoje
                    ? '#EFF6FF'
                    : feriado
                    ? '#FEF2F2'
                    : 'var(--color-warm-white)',
                }}
              >
                <div
                  className="text-xs font-semibold mb-0.5"
                  style={{
                    color: hoje ? '#1D4ED8' : feriado ? '#EF4444' : 'var(--color-ink-faint)',
                  }}
                >
                  {diasCurtos[day.getDay()]}
                </div>
                <div
                  className="text-lg font-bold mb-1"
                  style={{
                    color: hoje ? '#1D4ED8' : feriado ? '#F87171' : 'var(--color-ink)',
                  }}
                >
                  {day.getDate()}
                </div>
                {feriado && (
                  <div className="text-xs mb-1 leading-tight" style={{ color: '#EF4444' }}>
                    {feriado.descricao}
                  </div>
                )}
                <div className="space-y-1">
                  {evs.map(ev => {
                    const s = hoje
                      ? { background: '#BFDBFE', color: '#1E40AF', border: '#93C5FD' }
                      : (tipoStyle[ev.tipo] ?? tipoStyle.outro)
                    return (
                      <button
                        key={ev.id}
                        onClick={() => setEventoAberto(ev)}
                        className="w-full text-left rounded px-1.5 py-1 transition-opacity hover:opacity-80"
                        style={{
                          background: s.background,
                          color: s.color,
                          border: `1px solid ${s.border}`,
                        }}
                      >
                        <div className="text-xs font-medium">{horaEvento(ev.data_hora)}</div>
                        <div className="text-xs leading-tight truncate">
                          {ev.paciente?.nome ?? ev.titulo}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Vista Mensal ── */}
      {view === 'mes' && (
        <div>
          <div className="grid grid-cols-7 mb-1">
            {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map(d => (
              <div
                key={d}
                className="text-center text-xs font-medium py-1"
                style={{ color: 'var(--color-ink-faint)' }}
              >
                {d}
              </div>
            ))}
          </div>
          <div
            className="grid grid-cols-7 rounded-xl overflow-hidden"
            style={{ gap: '1px', background: 'var(--color-border-soft)' }}
          >
            {calDays.map((day, i) => {
              if (!day) return (
                <div key={i} className="h-20" style={{ background: 'var(--color-canvas)' }} />
              )
              const evs = getEventosForDate(day, eventos)
              const feriado = getFeriadoForDate(day, feriados)
              const hoje = isToday(day)
              const isDomingo = day.getDay() === 0
              return (
                <div
                  key={i}
                  className="p-1.5 min-h-[5rem]"
                  style={{
                    background: hoje
                      ? '#EFF6FF'
                      : feriado
                      ? '#FEF2F2'
                      : isDomingo
                      ? 'var(--color-canvas)'
                      : 'var(--color-warm-white)',
                  }}
                >
                  <div
                    className="text-xs font-bold mb-1"
                    style={{
                      color: hoje
                        ? '#1D4ED8'
                        : feriado
                        ? '#EF4444'
                        : isDomingo
                        ? 'var(--color-border)'
                        : 'var(--color-ink-soft)',
                    }}
                  >
                    {day.getDate()}
                    {feriado && <span className="ml-1" style={{ color: '#F87171' }}>•</span>}
                  </div>
                  <div className="space-y-0.5">
                    {evs.slice(0, 2).map(ev => {
                      const s = hoje
                        ? { background: '#BFDBFE', color: '#1E40AF', border: '#93C5FD' }
                        : (tipoStyle[ev.tipo] ?? tipoStyle.outro)
                      return (
                        <button
                          key={ev.id}
                          onClick={() => setEventoAberto(ev)}
                          className="w-full text-left text-xs px-1 rounded truncate transition-opacity hover:opacity-80"
                          style={{ background: s.background, color: s.color }}
                        >
                          {horaEvento(ev.data_hora)} {ev.paciente?.nome.split(' ')[0] ?? ev.titulo}
                        </button>
                      )
                    })}
                    {evs.length > 2 && (
                      <button
                        onClick={() => setDiaAberto({ dateStr: localDateStr(day), evs })}
                        className="text-xs transition-opacity hover:opacity-70 w-full text-left"
                        style={{ color: 'var(--color-ink-faint)' }}
                      >
                        +{evs.length - 2} mais
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
          {feriados
            .filter(f => {
              const d = new Date(f.data + 'T12:00:00')
              return d.getFullYear() === mesAno.getFullYear() && d.getMonth() === mesAno.getMonth()
            })
            .map(f => (
              <div key={f.data} className="mt-2 text-xs" style={{ color: '#EF4444' }}>
                • {new Date(f.data + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })} — {f.descricao}
              </div>
            ))}
        </div>
      )}

      {/* Modal: todos eventos do dia */}
      {diaAberto && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 p-4"
          style={{ background: 'rgba(44,32,24,0.4)' }}
          onClick={() => setDiaAberto(null)}
        >
          <div
            className="rounded-2xl p-5 max-w-sm w-full space-y-3 max-h-[80vh] overflow-y-auto"
            style={{ background: 'var(--color-warm-white)', boxShadow: '0 20px 60px rgba(44,32,24,0.2)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-semibold" style={{ color: 'var(--color-ink)' }}>
                {new Date(diaAberto.dateStr + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
              </h3>
              <button onClick={() => setDiaAberto(null)} className="text-lg leading-none hover:opacity-60" style={{ color: 'var(--color-ink-faint)' }}>×</button>
            </div>
            <div className="space-y-2">
              {diaAberto.evs.map(ev => {
                const s = tipoStyle[ev.tipo] ?? tipoStyle.outro
                return (
                  <button
                    key={ev.id}
                    onClick={() => { setDiaAberto(null); setEventoAberto(ev) }}
                    className="w-full text-left rounded-xl px-3 py-2 transition-opacity hover:opacity-80"
                    style={{ background: s.background, border: `1px solid ${s.border}` }}
                  >
                    <div className="text-xs font-medium" style={{ color: s.color }}>{horaEvento(ev.data_hora)} · {tipoLabel[ev.tipo] ?? ev.tipo}</div>
                    <div className="text-sm" style={{ color: 'var(--color-ink)' }}>{ev.paciente?.nome ?? ev.titulo}</div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Modal de detalhe do evento */}
      {eventoAberto && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 p-4"
          style={{ background: 'rgba(44,32,24,0.4)' }}
          onClick={() => setEventoAberto(null)}
        >
          <div
            className="rounded-2xl p-5 max-w-sm w-full space-y-3"
            style={{
              background: 'var(--color-warm-white)',
              boxShadow: '0 20px 60px rgba(44,32,24,0.2)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{
                    background: (tipoStyle[eventoAberto.tipo] ?? tipoStyle.outro).background,
                    color: (tipoStyle[eventoAberto.tipo] ?? tipoStyle.outro).color,
                  }}
                >
                  {tipoLabel[eventoAberto.tipo] ?? eventoAberto.tipo}
                </span>
                <h3
                  className="font-semibold mt-1"
                  style={{ color: 'var(--color-ink)' }}
                >
                  {eventoAberto.titulo}
                </h3>
              </div>
              <button
                onClick={() => setEventoAberto(null)}
                className="text-lg leading-none transition-opacity hover:opacity-60"
                style={{ color: 'var(--color-ink-faint)' }}
              >
                ×
              </button>
            </div>

            {eventoAberto.paciente && (
              <div className="text-sm" style={{ color: 'var(--color-ink-mid)' }}>
                <span
                  className="text-xs uppercase tracking-wide block mb-0.5"
                  style={{ color: 'var(--color-ink-faint)' }}
                >
                  Paciente
                </span>
                {eventoAberto.paciente.nome}
              </div>
            )}

            <div className="text-sm" style={{ color: 'var(--color-ink-mid)' }}>
              <span
                className="text-xs uppercase tracking-wide block mb-0.5"
                style={{ color: 'var(--color-ink-faint)' }}
              >
                Data e hora
              </span>
              {new Date(eventoAberto.data_hora).toLocaleDateString('pt-BR', {
                weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
              })} · {horaEvento(eventoAberto.data_hora)}
            </div>

            <div className="text-sm" style={{ color: 'var(--color-ink-mid)' }}>
              <span
                className="text-xs uppercase tracking-wide block mb-0.5"
                style={{ color: 'var(--color-ink-faint)' }}
              >
                Duração
              </span>
              {eventoAberto.duracao_minutos} minutos
            </div>

            {eventoAberto.motivo && (
              <div className="text-sm" style={{ color: 'var(--color-ink-mid)' }}>
                <span
                  className="text-xs uppercase tracking-wide block mb-0.5"
                  style={{ color: 'var(--color-ink-faint)' }}
                >
                  Observação
                </span>
                {eventoAberto.motivo}
              </div>
            )}

            {/* Confirmação via WhatsApp — apenas para sessões com paciente */}
            {eventoAberto.tipo === 'sessao' && eventoAberto.paciente && (
              <div
                className="pt-2 space-y-2"
                style={{ borderTop: '1px solid var(--color-border-soft)' }}
              >
                <span
                  className="text-xs uppercase tracking-wide block"
                  style={{ color: 'var(--color-ink-faint)' }}
                >
                  Confirmação de presença
                </span>

                {/* Badge de status */}
                {confirmacaoStatus && confirmacaoConfig[confirmacaoStatus] && (
                  <div
                    className="text-xs px-3 py-1.5 rounded-lg font-medium"
                    style={{
                      background: confirmacaoConfig[confirmacaoStatus].bg,
                      color: confirmacaoConfig[confirmacaoStatus].color,
                      border: `1px solid ${confirmacaoConfig[confirmacaoStatus].border}`,
                    }}
                  >
                    {confirmacaoConfig[confirmacaoStatus].label}
                  </div>
                )}

                {/* Botão WhatsApp */}
                {podaEnviarWA && (
                  <button
                    onClick={handleEnviarWhatsApp}
                    disabled={waLoading}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-opacity hover:opacity-85 disabled:opacity-50"
                    style={{
                      background: '#25D366',
                      color: '#fff',
                    }}
                  >
                    <IconeWhatsApp />
                    {waLoading
                      ? 'Preparando...'
                      : confirmacaoStatus === 'pendente'
                      ? 'Reenviar via WhatsApp'
                      : 'Enviar via WhatsApp'}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
