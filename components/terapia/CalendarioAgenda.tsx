'use client'

import { useRouter } from 'next/navigation'
import { useState, useEffect, useMemo, type FormEvent } from 'react'
import { Trash2, Calendar, MessageCircle, Lock } from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────

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

interface ConflitoBloqueio {
  id: string
  origem: 'recorrente' | 'agendamento'
  tipo: string
  titulo: string
  data_hora: string
  duracao_minutos: number
  pacienteId: string | null
  pacienteNome: string | null
}

interface SugestaoReposicao {
  data_hora: string
  duracao_minutos: number
}

interface BloqueioPendente {
  data_hora: string
  duracao_minutos: number
  motivo: string | null
}

type ViewType = 'dia' | 'semana' | 'mes' | 'programacao'

// ── Constants ─────────────────────────────────────────────────────────────────

const tipoStyle: Record<string, { background: string; color: string; border: string }> = {
  sessao:     { background: 'var(--color-rose-blush)',         color: 'var(--color-rose-deep)',         border: 'var(--color-rose-soft)' },
  devolutiva: { background: 'var(--color-lavender-light)',     color: 'var(--color-lavender-main)',     border: 'var(--color-lavender-soft)' },
  reuniao:    { background: 'var(--color-agenda-reuniao-bg)',  color: 'var(--color-agenda-reuniao-text)',  border: 'var(--color-agenda-reuniao-border)' },
  reposicao:  { background: 'var(--color-agenda-reposicao-bg)', color: 'var(--color-agenda-reposicao-text)', border: 'var(--color-agenda-reposicao-border)' },
  bloqueio:   { background: 'var(--color-agenda-bloqueio-bg)', color: 'var(--color-agenda-bloqueio-text)', border: 'var(--color-agenda-bloqueio-border)' },
  outro:      { background: 'var(--color-border-soft)',        color: 'var(--color-ink-mid)',           border: 'var(--color-border)' },
}

const tipoLabel: Record<string, string> = {
  sessao: 'Sessão', devolutiva: 'Devolutiva', reuniao: 'Reunião',
  reposicao: 'Reposição', bloqueio: 'Bloqueio', outro: 'Outro',
}

const confirmacaoConfig: Record<string, { label: string; icon: string; bg: string; color: string; border: string }> = {
  pendente:   { icon: '⏳', label: 'Aguardando confirmação',              bg: 'var(--color-status-pendente-bg)',   color: 'var(--color-status-pendente-text)',   border: 'var(--color-status-pendente-border)' },
  confirmada: { icon: '✅', label: 'Confirmada pelo responsável',         bg: 'var(--color-status-confirmada-bg)', color: 'var(--color-status-confirmada-text)', border: 'var(--color-status-confirmada-border)' },
  cancelada:  { icon: '❌', label: 'Cancelada pelo responsável',          bg: 'var(--color-status-cancelada-bg)',  color: 'var(--color-status-cancelada-text)',  border: 'var(--color-status-cancelada-border)' },
  expirada:   { icon: '⚠️', label: 'Expirada — confirmada para cobrança', bg: 'var(--color-status-expirada-bg)',   color: 'var(--color-status-expirada-text)',   border: 'var(--color-status-expirada-border)' },
}

const VIEWS: Array<{ key: ViewType; label: string }> = [
  { key: 'dia',         label: 'Dia' },
  { key: 'semana',      label: 'Semana' },
  { key: 'mes',         label: 'Mês' },
  { key: 'programacao', label: 'Programação' },
]

const HORA_INICIO = 7
const HORA_FIM = 22
const PX_POR_HORA = 64

// ── Helpers ───────────────────────────────────────────────────────────────────

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

function isWeekend(date: Date): boolean {
  const day = date.getDay()
  return day === 0 || day === 6
}

function getMonthGridDays(monthStart: Date, mostrarFimSemana: boolean): (Date | null)[] {
  let start = getMondayOfWeek(monthStart)
  if (!mostrarFimSemana && isWeekend(monthStart)) {
    start = addDays(monthStart, monthStart.getDay() === 6 ? 2 : 1)
  }
  const lastDay = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0)
  const lastWeekMonday = getMondayOfWeek(lastDay)
  const end = addDays(lastWeekMonday, mostrarFimSemana ? 6 : 4)
  const days: (Date | null)[] = []

  for (let cursor = new Date(start); cursor <= end; cursor = addDays(cursor, 1)) {
    if (!mostrarFimSemana && isWeekend(cursor)) continue
    days.push(cursor.getMonth() === monthStart.getMonth() ? new Date(cursor) : null)
  }

  return days
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

function horaFimEvento(iso: string, duracao: number): string {
  return new Date(new Date(iso).getTime() + duracao * 60000)
    .toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function horaInputInicial() {
  const d = new Date()
  d.setMinutes(Math.ceil(d.getMinutes() / 10) * 10, 0, 0)
  return d.toTimeString().slice(0, 5)
}

function toIsoBRT(data: string, hora: string) {
  return `${data}T${hora}:00-03:00`
}

function formatarDataHora(iso: string) {
  const d = new Date(iso)
  return `${d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })} · ${horaEvento(iso)}`
}

function iniciais(nome: string): string {
  return nome.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
}

// ── Sub-components ────────────────────────────────────────────────────────────

function IconeWhatsApp({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 00-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  )
}

function ViewIcon({ tipo }: { tipo: ViewType }) {
  const p = {
    width: 15, height: 15, viewBox: '0 0 24 24', fill: 'none',
    stroke: 'currentColor', strokeWidth: '2',
    strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
  }
  if (tipo === 'dia') return (
    <svg {...p}>
      <rect x="3" y="4" width="18" height="18" rx="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
      <line x1="12" y1="14" x2="12" y2="18"/>
    </svg>
  )
  if (tipo === 'semana') return (
    <svg {...p}>
      <rect x="3" y="4" width="18" height="18" rx="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
      <line x1="9" y1="10" x2="9" y2="22"/><line x1="15" y1="10" x2="15" y2="22"/>
    </svg>
  )
  if (tipo === 'mes') return (
    <svg {...p}>
      <rect x="3" y="4" width="18" height="18" rx="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
      <line x1="9" y1="10" x2="9" y2="22"/><line x1="15" y1="10" x2="15" y2="22"/>
      <line x1="3" y1="16" x2="21" y2="16"/>
    </svg>
  )
  return (
    <svg {...p}>
      <line x1="8" y1="6" x2="21" y2="6"/>
      <line x1="8" y1="12" x2="21" y2="12"/>
      <line x1="8" y1="18" x2="21" y2="18"/>
      <circle cx="3.5" cy="6" r="1" fill="currentColor" stroke="none"/>
      <circle cx="3.5" cy="12" r="1" fill="currentColor" stroke="none"/>
      <circle cx="3.5" cy="18" r="1" fill="currentColor" stroke="none"/>
    </svg>
  )
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      onClick={() => onChange(!value)}
      className="flex items-center justify-between w-full gap-2"
    >
      <span className="text-xs text-left" style={{ color: 'var(--color-ink-soft)' }}>{label}</span>
      <span
        className="relative inline-flex h-5 w-9 rounded-full transition-colors flex-shrink-0"
        style={{ background: value ? 'var(--color-rose-main)' : 'var(--color-border)' }}
      >
        <span
          className="inline-block h-4 w-4 rounded-full bg-white shadow transition-transform"
          style={{ marginTop: 2, marginLeft: 2, transform: value ? 'translateX(16px)' : 'translateX(0)' }}
        />
      </span>
    </button>
  )
}

// ── MiniCalendario ────────────────────────────────────────────────────────────

function MiniCalendario({
  dataBase,
  eventos,
  onDiaClick,
}: {
  dataBase: Date
  eventos: EventoAgenda[]
  onDiaClick: (d: Date) => void
}) {
  const baseYear = dataBase.getFullYear()
  const baseMonth = dataBase.getMonth()
  const [mesNav, setMesNav] = useState(() => new Date(baseYear, baseMonth, 1))

  const diasComEventos = useMemo(() => {
    const s = new Set<string>()
    eventos.forEach(e => s.add(localDateStr(new Date(e.data_hora))))
    return s
  }, [eventos])

  const mesLabel = mesNav.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  const firstDow = mesNav.getDay()
  const offset = firstDow === 0 ? 6 : firstDow - 1
  const daysInMonth = new Date(mesNav.getFullYear(), mesNav.getMonth() + 1, 0).getDate()
  const totalCells = Math.ceil((offset + daysInMonth) / 7) * 7
  const selecionadoStr = localDateStr(dataBase)

  return (
    <div className="px-3 pt-3 pb-2">
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={() => setMesNav(m => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
          className="w-6 h-6 flex items-center justify-center rounded text-lg transition-opacity hover:opacity-60"
          style={{ color: 'var(--color-ink-soft)' }}
        >‹</button>
        <span className="text-xs font-semibold capitalize" style={{ color: 'var(--color-ink-mid)' }}>
          {mesLabel}
        </span>
        <button
          onClick={() => setMesNav(m => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
          className="w-6 h-6 flex items-center justify-center rounded text-lg transition-opacity hover:opacity-60"
          style={{ color: 'var(--color-ink-soft)' }}
        >›</button>
      </div>

      <div className="grid grid-cols-7 mb-0.5">
        {['S','T','Q','Q','S','S','D'].map((d, i) => (
          <div key={i} className="text-center" style={{ fontSize: 12, color: 'var(--color-ink-faint)', height: 20, lineHeight: '20px' }}>
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {Array.from({ length: totalCells }, (_, i) => {
          const dayNum = i - offset + 1
          if (dayNum < 1 || dayNum > daysInMonth) return <div key={i} style={{ height: 26 }} />
          const d = new Date(mesNav.getFullYear(), mesNav.getMonth(), dayNum)
          const dStr = localDateStr(d)
          const hoje = isToday(d)
          const selecionado = dStr === selecionadoStr
          const temEvento = diasComEventos.has(dStr)
          return (
            <button
              key={i}
              onClick={() => onDiaClick(d)}
              aria-label={`${dayNum} de ${d.toLocaleDateString('pt-BR', { month: 'long' })}${hoje ? ', hoje' : ''}${temEvento ? ', tem eventos' : ''}`}
              aria-pressed={selecionado}
              className="flex flex-col items-center justify-center rounded-md transition-all"
              style={{
                height: 26,
                fontSize: 13,
                fontWeight: selecionado || hoje ? 700 : 400,
                background: selecionado ? 'var(--color-rose-main)' : hoje ? 'var(--color-rose-blush)' : 'transparent',
                color: selecionado ? '#fff' : hoje ? 'var(--color-rose-deep)' : 'var(--color-ink-mid)',
              }}
            >
              <span>{dayNum}</span>
              {temEvento && !selecionado && (
                <span
                  className="block rounded-full"
                  style={{ width: 3, height: 3, background: hoje ? 'var(--color-rose-deep)' : 'var(--color-rose-main)', marginTop: -2 }}
                />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── ViewDia ───────────────────────────────────────────────────────────────────

function ViewDia({
  dia,
  eventos,
  feriados,
  onEventClick,
}: {
  dia: Date
  eventos: EventoAgenda[]
  feriados: Feriado[]
  onEventClick: (e: EventoAgenda) => void
}) {
  const evs = getEventosForDate(dia, eventos)
  const feriado = getFeriadoForDate(dia, feriados)
  const hoje = isToday(dia)
  const totalPx = (HORA_FIM - HORA_INICIO) * PX_POR_HORA

  const agoraTop = useMemo(() => {
    if (!hoje) return null
    const now = new Date()
    const min = (now.getHours() - HORA_INICIO) * 60 + now.getMinutes()
    if (min < 0 || min > (HORA_FIM - HORA_INICIO) * 60) return null
    return min * PX_POR_HORA / 60
  }, [hoje])

  return (
    <div>
      <div
        className="mb-4 px-3 py-2.5 rounded-xl flex items-center gap-3"
        style={{
          background: hoje ? 'var(--color-today-bg)' : feriado ? 'var(--color-feriado-bg)' : 'var(--color-warm-white)',
          border: `1px solid ${hoje ? 'var(--color-today-border)' : feriado ? 'var(--color-feriado-border)' : 'var(--color-border-soft)'}`,
        }}
      >
        <div className="flex-1">
          <div
            className="font-semibold capitalize"
            style={{ color: hoje ? 'var(--color-today-text)' : feriado ? 'var(--color-feriado-text)' : 'var(--color-ink)', fontFamily: 'var(--font-lora)' }}
          >
            {dia.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
          </div>
          {feriado && <div className="text-xs mt-0.5" style={{ color: 'var(--color-feriado-text)' }}>{feriado.descricao}</div>}
          {evs.length === 0 && (
            <div className="text-sm mt-0.5" style={{ color: 'var(--color-ink-faint)' }}>Nenhum agendamento neste dia</div>
          )}
        </div>
        {evs.length > 0 && (
          <span
            className="text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0"
            style={{ background: 'var(--color-rose-blush)', color: 'var(--color-rose-deep)' }}
          >
            {evs.length} atendimento{evs.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      <div className="relative flex" style={{ height: totalPx }}>
        {/* Time labels */}
        <div className="relative flex-shrink-0" style={{ width: 44 }}>
          {Array.from({ length: HORA_FIM - HORA_INICIO + 1 }, (_, i) => (
            <div
              key={i}
              className="absolute text-right"
              style={{ top: i * PX_POR_HORA - 8, right: 6, fontSize: 12, color: 'var(--color-ink-faint)', userSelect: 'none' }}
            >
              {String(HORA_INICIO + i).padStart(2, '0')}:00
            </div>
          ))}
        </div>

        {/* Grid + events */}
        <div className="flex-1 relative" style={{ minWidth: 0 }}>
          {Array.from({ length: HORA_FIM - HORA_INICIO + 1 }, (_, i) => (
            <div key={i} className="absolute inset-x-0" style={{ top: i * PX_POR_HORA, borderTop: '1px solid var(--color-border-soft)' }} />
          ))}
          {Array.from({ length: HORA_FIM - HORA_INICIO }, (_, i) => (
            <div key={`h${i}`} className="absolute inset-x-0" style={{ top: (i + 0.5) * PX_POR_HORA, borderTop: '1px dashed var(--color-border-soft)', opacity: 0.4 }} />
          ))}
          {agoraTop !== null && (
            <div className="absolute inset-x-0 z-10 flex items-center" style={{ top: agoraTop }}>
              <div className="w-2.5 h-2.5 rounded-full -ml-1.5 flex-shrink-0" style={{ background: 'var(--color-rose-main)' }} />
              <div className="flex-1 h-px" style={{ background: 'var(--color-rose-main)' }} />
            </div>
          )}
          {evs.map(ev => {
            const d = new Date(ev.data_hora)
            const minDesde = (d.getHours() - HORA_INICIO) * 60 + d.getMinutes()
            const top = Math.max(0, minDesde * PX_POR_HORA / 60)
            const height = Math.max(ev.duracao_minutos * PX_POR_HORA / 60, 32)
            const s = tipoStyle[ev.tipo] ?? tipoStyle.outro
            return (
              <button
                key={ev.id}
                onClick={() => onEventClick(ev)}
                className="absolute left-1 right-1 rounded-lg px-2.5 py-1.5 text-left transition-opacity hover:opacity-85 overflow-hidden shadow-sm"
                style={{ top, height, background: s.background, border: `1px solid ${s.border}`, color: s.color }}
              >
                <div className="text-xs font-bold leading-tight">
                  {horaEvento(ev.data_hora)} – {horaFimEvento(ev.data_hora, ev.duracao_minutos)}
                </div>
                <div className="text-xs leading-tight truncate font-medium" style={{ color: 'var(--color-ink)' }}>
                  {ev.paciente?.nome ?? ev.titulo}
                </div>
                {height > 46 && (
                  <div className="text-xs opacity-70 mt-0.5">{tipoLabel[ev.tipo] ?? ev.tipo}</div>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── ViewProgramacao ───────────────────────────────────────────────────────────

function ViewProgramacao({
  dataBase,
  eventos,
  feriados,
  mostrarFimSemana,
  onEventClick,
}: {
  dataBase: Date
  eventos: EventoAgenda[]
  feriados: Feriado[]
  mostrarFimSemana: boolean
  onEventClick: (e: EventoAgenda) => void
}) {
  const monday = getMondayOfWeek(dataBase)
  const days = Array.from({ length: mostrarFimSemana ? 7 : 5 }, (_, i) => addDays(monday, i))

  return (
    <div className="space-y-5">
      {days.map((day, i) => {
        const evs = getEventosForDate(day, eventos)
        const feriado = getFeriadoForDate(day, feriados)
        const hoje = isToday(day)
        return (
          <div key={i}>
            <div className="flex items-center gap-2 mb-2">
              <span
                className="text-sm font-semibold capitalize px-2.5 py-0.5 rounded-full"
                style={{
                  background: hoje ? 'var(--color-rose-main)' : 'transparent',
                  color: hoje ? '#fff' : feriado ? 'var(--color-feriado-text)' : 'var(--color-ink-mid)',
                }}
              >
                {day.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
              </span>
              {feriado && !hoje && (
                <span className="text-xs" style={{ color: 'var(--color-feriado-text)' }}>• {feriado.descricao}</span>
              )}
              {evs.length > 0 && (
                <span className="text-xs ml-auto" style={{ color: 'var(--color-ink-faint)' }}>
                  {evs.length} atendimento{evs.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>

            {evs.length === 0 ? (
              <p className="text-xs pl-2 pb-1" style={{ color: 'var(--color-ink-faint)' }}>Nenhum agendamento</p>
            ) : (
              <div className="space-y-1.5">
                {evs.map(ev => {
                  const s = tipoStyle[ev.tipo] ?? tipoStyle.outro
                  const status = ev.confirmacao?.status
                  return (
                    <button
                      key={ev.id}
                      onClick={() => onEventClick(ev)}
                      className="w-full text-left rounded-xl px-3 py-2.5 flex items-center gap-3 transition-opacity hover:opacity-85 shadow-sm"
                      style={{ background: s.background, border: `1px solid ${s.border}` }}
                    >
                      <div className="w-1 self-stretch rounded-full flex-shrink-0" style={{ background: s.color }} />
                      <div className="flex-shrink-0 text-center" style={{ minWidth: 52 }}>
                        <div className="text-sm font-bold" style={{ color: s.color }}>{horaEvento(ev.data_hora)}</div>
                        <div className="text-xs" style={{ color: s.color, opacity: 0.7 }}>{ev.duracao_minutos}min</div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold truncate" style={{ color: 'var(--color-ink)' }}>
                          {ev.paciente?.nome ?? ev.titulo}
                        </div>
                        <div className="text-xs mt-0.5" style={{ color: s.color }}>
                          {tipoLabel[ev.tipo] ?? ev.tipo}
                          {ev.motivo ? ` · ${ev.motivo}` : ''}
                        </div>
                      </div>
                      {status && confirmacaoConfig[status] && (
                        <span className="flex-shrink-0 text-base" title={confirmacaoConfig[status].label}>
                          {confirmacaoConfig[status].icon}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── ModalEvento ───────────────────────────────────────────────────────────────

function ModalEvento({
  evento,
  onClose,
  onEnviarWhatsApp,
  onRemoverBloqueio,
  waLoading,
  waConfirmacao,
  removerBloqueioLoading,
  removerBloqueioErro,
}: {
  evento: EventoAgenda
  onClose: () => void
  onEnviarWhatsApp: () => void
  onRemoverBloqueio?: () => void
  waLoading: boolean
  waConfirmacao: { token: string; status: string } | null
  removerBloqueioLoading: boolean
  removerBloqueioErro: string | null
}) {
  const [confirmandoRemover, setConfirmandoRemover] = useState(false)
  const s = tipoStyle[evento.tipo] ?? tipoStyle.outro
  const confirmacaoStatus = waConfirmacao?.status ?? evento.confirmacao?.status ?? null
  const podaEnviarWA =
    confirmacaoStatus === null ||
    confirmacaoStatus === 'cancelada' ||
    confirmacaoStatus === 'expirada' ||
    confirmacaoStatus === 'pendente'
  const podeEnviarConfirmacao =
    !!evento.paciente && (evento.tipo === 'sessao' || evento.tipo === 'reposicao')

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 p-4"
      style={{ background: 'rgba(44,32,24,0.45)' }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-evento-titulo"
        className="rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl"
        style={{ background: 'var(--color-warm-white)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Colored top bar */}
        <div className="h-1.5" style={{ background: s.color }} />

        {/* Header */}
        <div className="flex items-start justify-between px-5 pt-4 pb-3">
          <div>
            <span
              className="inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full"
              style={{ background: s.background, color: s.color, border: `1px solid ${s.border}` }}
            >
              {tipoLabel[evento.tipo] ?? evento.tipo}
            </span>
            <h3
              id="modal-evento-titulo"
              className="mt-1.5 text-base font-semibold leading-snug"
              style={{ color: 'var(--color-ink)', fontFamily: 'var(--font-lora)' }}
            >
              {evento.titulo}
            </h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="ml-3 flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-full transition-opacity hover:opacity-60 text-lg"
            style={{ color: 'var(--color-ink-faint)', background: 'var(--color-border-soft)' }}
          >×</button>
        </div>

        {/* Body */}
        <div className="px-5 pb-5 space-y-3">
          {/* Data e horário */}
          <div
            className="rounded-xl px-3 py-2.5 flex items-center gap-3"
            style={{ background: 'var(--color-canvas)', border: '1px solid var(--color-border-soft)' }}
          >
            <Calendar size={16} aria-hidden="true" className="flex-shrink-0" style={{ color: 'var(--color-ink-soft)' }} />
            <div>
              <div className="text-sm font-medium capitalize" style={{ color: 'var(--color-ink)' }}>
                {new Date(evento.data_hora).toLocaleDateString('pt-BR', {
                  weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
                })}
              </div>
              <div className="text-xs mt-0.5" style={{ color: 'var(--color-ink-soft)' }}>
                {horaEvento(evento.data_hora)} – {horaFimEvento(evento.data_hora, evento.duracao_minutos)}
                {' · '}{evento.duracao_minutos} minutos
              </div>
            </div>
          </div>

          {/* Paciente */}
          {evento.paciente && (
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0"
                style={{ background: 'var(--color-rose-blush)', color: 'var(--color-rose-deep)' }}
              >
                {iniciais(evento.paciente.nome)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs uppercase tracking-wide mb-0.5" style={{ color: 'var(--color-ink-faint)' }}>Paciente</div>
                <div className="text-sm font-medium truncate" style={{ color: 'var(--color-ink)' }}>{evento.paciente.nome}</div>
              </div>
              <a
                href={`/terapia/paciente/${evento.paciente.id}`}
                className="text-xs px-2 py-1 rounded-lg flex-shrink-0 transition-opacity hover:opacity-70"
                style={{ color: 'var(--color-rose-main)', border: '1px solid var(--color-rose-soft)' }}
                onClick={e => e.stopPropagation()}
              >
                Ver ficha
              </a>
            </div>
          )}

          {/* Status de confirmação */}
          {confirmacaoStatus && confirmacaoConfig[confirmacaoStatus] && (
            <div
              className="rounded-xl px-3 py-2 flex items-center gap-2"
              style={{
                background: confirmacaoConfig[confirmacaoStatus].bg,
                border: `1px solid ${confirmacaoConfig[confirmacaoStatus].border}`,
              }}
            >
              <span className="text-base">{confirmacaoConfig[confirmacaoStatus].icon}</span>
              <span className="text-xs font-medium" style={{ color: confirmacaoConfig[confirmacaoStatus].color }}>
                {confirmacaoConfig[confirmacaoStatus].label}
              </span>
            </div>
          )}

          {/* Observação */}
          {evento.motivo && (
            <div
              className="rounded-xl px-3 py-2.5 flex items-start gap-2"
              style={{ background: 'var(--color-canvas)', border: '1px solid var(--color-border-soft)' }}
            >
              <MessageCircle size={14} aria-hidden="true" className="flex-shrink-0 mt-0.5" style={{ color: 'var(--color-ink-soft)' }} />
              <div>
                <div className="text-xs uppercase tracking-wide mb-0.5" style={{ color: 'var(--color-ink-faint)' }}>Observação</div>
                <p className="text-sm" style={{ color: 'var(--color-ink-mid)' }}>{evento.motivo}</p>
              </div>
            </div>
          )}

          {/* WhatsApp */}
          {podeEnviarConfirmacao && (
            <div className="pt-1">
              {podaEnviarWA ? (
                <button
                  onClick={onEnviarWhatsApp}
                  disabled={waLoading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-85 disabled:opacity-50"
                  style={{ background: '#25D366', color: '#fff' }}
                >
                  <IconeWhatsApp />
                  {waLoading
                    ? 'Preparando...'
                    : confirmacaoStatus === 'pendente'
                    ? 'Reenviar confirmação'
                    : 'Confirmar presença via WhatsApp'}
                </button>
              ) : (
                <p className="text-xs text-center py-1" style={{ color: 'var(--color-ink-faint)' }}>
                  Confirmação já enviada — aguardando resposta
                </p>
              )}
            </div>
          )}

          {evento.tipo === 'bloqueio' && onRemoverBloqueio && (
            <div className="pt-1 space-y-2">
              {removerBloqueioErro && (
                <div className="text-xs rounded-xl px-3 py-2" style={{ background: 'var(--color-danger-bg)', color: 'var(--color-danger-text)', border: '1px solid var(--color-danger-border)' }}>
                  {removerBloqueioErro}
                </div>
              )}
              {confirmandoRemover ? (
                <div className="rounded-xl px-3 py-2.5 space-y-2" style={{ background: 'var(--color-danger-bg)', border: '1px solid var(--color-danger-border)' }}>
                  <p className="text-xs font-medium" style={{ color: 'var(--color-danger-text)' }}>Confirmar remoção deste bloqueio?</p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirmandoRemover(false)}
                      className="flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-opacity hover:opacity-80"
                      style={{ border: '1px solid var(--color-border)', color: 'var(--color-ink-soft)' }}
                    >Cancelar</button>
                    <button
                      type="button"
                      onClick={onRemoverBloqueio}
                      disabled={removerBloqueioLoading}
                      className="flex-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-opacity hover:opacity-85 disabled:opacity-50"
                      style={{ background: 'var(--color-danger-text)', color: '#fff' }}
                    >{removerBloqueioLoading ? 'Removendo...' : 'Confirmar'}</button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmandoRemover(true)}
                  disabled={removerBloqueioLoading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-85 disabled:opacity-50"
                  style={{ background: 'var(--color-danger-bg)', color: 'var(--color-danger-text)', border: '1px solid var(--color-danger-border)' }}
                >
                  <Trash2 size={14} />
                  Remover bloqueio
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main: CalendarioAgenda ────────────────────────────────────────────────────

export function CalendarioAgenda({ eventos, feriados }: Props) {
  const router = useRouter()

  const [view, setView] = useState<ViewType>('semana')
  const [dataBase, setDataBase] = useState(new Date())

  const [filtroStatus, setFiltroStatus] = useState('todos')
  const [filtroPacienteId, setFiltroPacienteId] = useState('todos')
  const [mostrarFimSemana, setMostrarFimSemana] = useState(false)
  const [mostrarFeriados, setMostrarFeriados] = useState(true)
  const [opcAvancadas, setOpcAvancadas] = useState(false)
  const [fabAberto, setFabAberto] = useState(false)

  const [eventoAberto, setEventoAberto] = useState<EventoAgenda | null>(null)
  const [diaAberto, setDiaAberto] = useState<{ dateStr: string; evs: EventoAgenda[] } | null>(null)
  const [waLoading, setWaLoading] = useState(false)
  const [waConfirmacao, setWaConfirmacao] = useState<{ token: string; status: string } | null>(null)
  const [removerBloqueioLoading, setRemoverBloqueioLoading] = useState(false)
  const [removerBloqueioErro, setRemoverBloqueioErro] = useState<string | null>(null)

  const [bloqueioAberto, setBloqueioAberto] = useState(false)
  const [bloqueioLoading, setBloqueioLoading] = useState(false)
  const [bloqueioErro, setBloqueioErro] = useState<string | null>(null)
  const [bloqueioForm, setBloqueioForm] = useState(() => ({
    data: localDateStr(new Date()),
    hora: horaInputInicial(),
    duracao: '50',
    motivo: '',
  }))
  const [bloqueioPendente, setBloqueioPendente] = useState<{
    payload: BloqueioPendente
    conflitos: ConflitoBloqueio[]
    sugestoes: SugestaoReposicao[]
  } | null>(null)
  const [reposicaoAberta, setReposicaoAberta] = useState(false)
  const [reposicaoSlot, setReposicaoSlot] = useState<string | null>(null)

  useEffect(() => {
    setWaConfirmacao(null)
    setWaLoading(false)
    setRemoverBloqueioErro(null)
    setRemoverBloqueioLoading(false)
  }, [eventoAberto?.id])

  const pacientesLista = useMemo(() => {
    const map = new Map<string, string>()
    eventos.forEach(e => { if (e.paciente) map.set(e.paciente.id, e.paciente.nome) })
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]))
  }, [eventos])

  const eventosFiltrados = useMemo(() => {
    return eventos.filter(e => {
      if (filtroStatus !== 'todos' && e.tipo !== filtroStatus) return false
      if (filtroPacienteId !== 'todos' && e.paciente?.id !== filtroPacienteId) return false
      return true
    })
  }, [eventos, filtroStatus, filtroPacienteId])

  const feriadosFiltrados = mostrarFeriados ? feriados : []

  function navAnterior() {
    if (view === 'dia') setDataBase(d => addDays(d, -1))
    else if (view === 'semana' || view === 'programacao') setDataBase(d => addDays(d, -7))
    else setDataBase(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))
  }
  function navProximo() {
    if (view === 'dia') setDataBase(d => addDays(d, 1))
    else if (view === 'semana' || view === 'programacao') setDataBase(d => addDays(d, 7))
    else setDataBase(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))
  }

  const dataLabel = useMemo(() => {
    if (view === 'dia') {
      return dataBase.toLocaleDateString('pt-BR', {
        weekday: 'short', day: '2-digit', month: 'long', year: 'numeric',
      })
    }
    if (view === 'semana' || view === 'programacao') {
      const mon = getMondayOfWeek(dataBase)
      const end = addDays(mon, mostrarFimSemana ? 6 : 4)
      const opts: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short' }
      return `${mon.toLocaleDateString('pt-BR', opts)} – ${end.toLocaleDateString('pt-BR', { ...opts, year: 'numeric' })}`
    }
    return new Date(dataBase.getFullYear(), dataBase.getMonth(), 1)
      .toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  }, [view, dataBase, mostrarFimSemana])

  async function handleEnviarWhatsApp() {
    if (!eventoAberto?.paciente) return
    setWaLoading(true)
    try {
      const res = await fetch('/api/sessao/confirmacao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paciente_id: eventoAberto.paciente.id, data_hora: eventoAberto.data_hora }),
      })
      const json = await res.json()
      if (res.ok && json.waUrl) {
        window.open(json.waUrl, '_blank', 'noopener,noreferrer')
        setWaConfirmacao({ token: json.token, status: json.status ?? 'pendente' })
      }
    } catch { /* silent */ } finally {
      setWaLoading(false)
    }
  }

  async function handleRemoverBloqueio() {
    if (!eventoAberto || eventoAberto.tipo !== 'bloqueio') return
    setRemoverBloqueioLoading(true)
    setRemoverBloqueioErro(null)
    try {
      const res = await fetch(`/api/terapeuta/bloqueio?id=${encodeURIComponent(eventoAberto.id)}`, {
        method: 'DELETE',
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setRemoverBloqueioErro(json.error ?? 'Erro ao remover bloqueio.')
        return
      }
      setEventoAberto(null)
      router.refresh()
    } catch {
      setRemoverBloqueioErro('Erro de conexÃ£o ao remover bloqueio.')
    } finally {
      setRemoverBloqueioLoading(false)
    }
  }

  function limparBloqueio() {
    setBloqueioAberto(false)
    setBloqueioPendente(null)
    setReposicaoAberta(false)
    setReposicaoSlot(null)
    setBloqueioErro(null)
  }

  async function postBloqueio(body: Record<string, unknown>) {
    setBloqueioLoading(true)
    setBloqueioErro(null)
    try {
      const res = await fetch('/api/terapeuta/bloqueio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) { setBloqueioErro(json.error ?? 'Erro ao salvar bloqueio.'); return null }
      return json
    } catch {
      setBloqueioErro('Erro de conexão ao salvar bloqueio.')
      return null
    } finally {
      setBloqueioLoading(false)
    }
  }

  async function handleVerificarBloqueio(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const payload: BloqueioPendente = {
      data_hora: toIsoBRT(bloqueioForm.data, bloqueioForm.hora),
      duracao_minutos: Number(bloqueioForm.duracao) || 50,
      motivo: bloqueioForm.motivo.trim() || null,
    }
    const json = await postBloqueio({ modo: 'verificar', ...payload })
    if (!json) return
    const conflitos = (json.conflitos ?? []) as ConflitoBloqueio[]
    const sugestoes = (json.sugestoes ?? []) as SugestaoReposicao[]
    if (conflitos.length === 0) {
      const criado = await postBloqueio({ modo: 'confirmar', ...payload })
      if (!criado) return
      limparBloqueio()
      router.refresh()
      return
    }
    setBloqueioAberto(false)
    setBloqueioPendente({ payload, conflitos, sugestoes })
    setReposicaoSlot(sugestoes[0]?.data_hora ?? null)
  }

  async function handleConfirmarBloqueio() {
    if (!bloqueioPendente) return
    const criado = await postBloqueio({ modo: 'confirmar', ...bloqueioPendente.payload })
    if (!criado) return
    limparBloqueio()
    router.refresh()
  }

  async function handleReposicaoBloqueio() {
    if (!bloqueioPendente || !reposicaoSlot) return
    const conflito = bloqueioPendente.conflitos[0]
    const criado = await postBloqueio({
      modo: 'reposicao',
      ...bloqueioPendente.payload,
      conflito_id: conflito.id,
      reposicao_data_hora: reposicaoSlot,
    })
    if (!criado) return
    limparBloqueio()
    router.refresh()
  }

  // Semana
  const numDias = mostrarFimSemana ? 7 : 5
  const monday = getMondayOfWeek(dataBase)
  const weekDays = Array.from({ length: numDias }, (_, i) => addDays(monday, i))

  // Mês
  const mesAno = new Date(dataBase.getFullYear(), dataBase.getMonth(), 1)
  const mesColunas = mostrarFimSemana ? 7 : 5
  const calDays = getMonthGridDays(mesAno, mostrarFimSemana)

  const filtersActive = filtroStatus !== 'todos' || filtroPacienteId !== 'todos'

  return (
    <>
      <div className="flex flex-col lg:flex-row items-start" style={{ minHeight: '75vh' }}>

        {/* ── Sidebar — hidden on mobile ────────────────────────────────── */}
        <div
          className="hidden lg:flex flex-shrink-0 flex-col"
          style={{ width: 208, borderRight: '1px solid var(--color-border-soft)', minHeight: '75vh' }}
        >
          <MiniCalendario
            key={`${dataBase.getFullYear()}-${dataBase.getMonth()}`}
            dataBase={dataBase}
            eventos={eventosFiltrados}
            onDiaClick={d => { setDataBase(d); setView('dia') }}
          />

          <div style={{ borderTop: '1px solid var(--color-border-soft)' }} />

          <nav className="py-1.5">
            {VIEWS.map(v => {
              const ativa = view === v.key
              return (
                <button
                  key={v.key}
                  onClick={() => setView(v.key)}
                  className="w-full text-left px-3 py-2 mx-1 text-sm font-medium flex items-center gap-2.5 transition-all rounded-lg"
                  style={{
                    background: ativa ? 'var(--color-rose-blush)' : 'transparent',
                    color: ativa ? 'var(--color-rose-deep)' : 'var(--color-ink-mid)',
                    fontWeight: ativa ? 600 : 400,
                  }}
                >
                  <ViewIcon tipo={v.key} />
                  {v.label}
                </button>
              )
            })}
          </nav>

          <div style={{ borderTop: '1px solid var(--color-border-soft)' }} />

          <div className="px-3 py-3 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-ink-faint)' }}>
                Filtros
              </span>
              {filtersActive && (
                <button
                  onClick={() => { setFiltroStatus('todos'); setFiltroPacienteId('todos') }}
                  className="text-xs transition-opacity hover:opacity-70"
                  style={{ color: 'var(--color-rose-main)' }}
                >
                  Limpar
                </button>
              )}
            </div>

            <div>
              <label className="text-xs block mb-1" style={{ color: 'var(--color-ink-soft)' }}>Tipo</label>
              <select
                value={filtroStatus}
                onChange={e => setFiltroStatus(e.target.value)}
                className="w-full rounded-lg px-2 py-1.5 text-xs outline-none"
                style={{ border: '1px solid var(--color-border)', background: 'var(--color-warm-white)', color: 'var(--color-ink)' }}
              >
                <option value="todos">Todos</option>
                <option value="sessao">Sessão</option>
                <option value="devolutiva">Devolutiva</option>
                <option value="reuniao">Reunião</option>
                <option value="reposicao">Reposição</option>
                <option value="bloqueio">Bloqueio</option>
                <option value="outro">Outro</option>
              </select>
            </div>

            {pacientesLista.length > 0 && (
              <div>
                <label className="text-xs block mb-1" style={{ color: 'var(--color-ink-soft)' }}>Paciente</label>
                <select
                  value={filtroPacienteId}
                  onChange={e => setFiltroPacienteId(e.target.value)}
                  className="w-full rounded-lg px-2 py-1.5 text-xs outline-none"
                  style={{ border: '1px solid var(--color-border)', background: 'var(--color-warm-white)', color: 'var(--color-ink)' }}
                >
                  <option value="todos">Todos</option>
                  {pacientesLista.map(([id, nome]) => (
                    <option key={id} value={id}>{nome.split(' ')[0]}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div style={{ borderTop: '1px solid var(--color-border-soft)' }} />

          <div className="px-3 py-3">
            <button
              onClick={() => setOpcAvancadas(v => !v)}
              className="flex items-center justify-between w-full mb-2 transition-opacity hover:opacity-70"
            >
              <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-ink-faint)' }}>
                Opções avançadas
              </span>
              <span className="text-xs" style={{ color: 'var(--color-ink-faint)' }}>{opcAvancadas ? '∧' : '∨'}</span>
            </button>
            {opcAvancadas && (
              <div className="space-y-3">
                <Toggle label="Mostrar fins de semana" value={mostrarFimSemana} onChange={setMostrarFimSemana} />
                <Toggle label="Mostrar feriados" value={mostrarFeriados} onChange={setMostrarFeriados} />
              </div>
            )}
          </div>
        </div>

        {/* ── Content ──────────────────────────────────────────────────────── */}
        <div className="flex-1 min-w-0 flex flex-col lg:pl-4">

          {/* Mobile view tabs */}
          <div className="flex lg:hidden items-center gap-1.5 py-2 mb-1 overflow-x-auto" style={{ borderBottom: '1px solid var(--color-border-soft)' }}>
            {VIEWS.map(v => {
              const ativa = view === v.key
              return (
                <button
                  key={v.key}
                  onClick={() => setView(v.key)}
                  className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                  style={{
                    background: ativa ? 'var(--color-rose-blush)' : 'transparent',
                    color: ativa ? 'var(--color-rose-deep)' : 'var(--color-ink-soft)',
                    border: `1px solid ${ativa ? 'var(--color-rose-soft)' : 'var(--color-border)'}`,
                  }}
                >
                  <ViewIcon tipo={v.key} />
                  {v.label}
                </button>
              )
            })}
          </div>

          {/* Header */}
          <div
            className="flex items-center gap-2 py-3 mb-3"
            style={{ borderBottom: '1px solid var(--color-border-soft)' }}
          >
            <button
              onClick={() => setDataBase(new Date())}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-all hover:opacity-85"
              style={{ border: '1px solid var(--color-border)', color: 'var(--color-ink-mid)', background: 'var(--color-warm-white)' }}
            >
              Hoje
            </button>
            <button
              onClick={navAnterior}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-lg transition-opacity hover:opacity-70"
              style={{ color: 'var(--color-ink-soft)' }}
            >‹</button>
            <button
              onClick={navProximo}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-lg transition-opacity hover:opacity-70"
              style={{ color: 'var(--color-ink-soft)' }}
            >›</button>
            <span className="text-sm font-semibold capitalize" style={{ color: 'var(--color-ink)' }}>
              {dataLabel}
            </span>
            {filtersActive && (
              <span
                className="ml-auto text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ background: 'var(--color-rose-blush)', color: 'var(--color-rose-deep)' }}
              >
                Filtros ativos
              </span>
            )}
          </div>

          {/* Views */}
          <div className="flex-1">
            {view === 'dia' && (
              <ViewDia
                dia={dataBase}
                eventos={eventosFiltrados}
                feriados={feriadosFiltrados}
                onEventClick={setEventoAberto}
              />
            )}

            {view === 'semana' && (
              <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${numDias}, 1fr)` }}>
                {weekDays.map((day, i) => {
                  const evs = getEventosForDate(day, eventosFiltrados)
                  const feriado = getFeriadoForDate(day, feriadosFiltrados)
                  const hoje = isToday(day)
                  return (
                    <div
                      key={i}
                      className="rounded-xl p-2 min-h-[140px]"
                      style={{
                        border: hoje ? '1px solid #BFDBFE' : feriado ? '1px solid #FECACA' : '1px solid var(--color-border-soft)',
                        background: hoje ? 'var(--color-today-bg)' : feriado ? 'var(--color-feriado-bg)' : 'var(--color-warm-white)',
                      }}
                    >
                      <div className="text-xs font-semibold mb-0.5" style={{ color: hoje ? 'var(--color-today-text)' : feriado ? 'var(--color-feriado-text)' : 'var(--color-ink-faint)' }}>
                        {['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'][day.getDay()]}
                      </div>
                      <div
                        className="text-lg font-bold mb-1 w-7 h-7 flex items-center justify-center rounded-full"
                        style={{ color: hoje ? '#fff' : feriado ? 'var(--color-feriado-soft)' : 'var(--color-ink)', background: hoje ? 'var(--color-today-text)' : 'transparent' }}
                      >
                        {day.getDate()}
                      </div>
                      {feriado && (
                        <div className="text-xs mb-1 leading-tight" style={{ color: 'var(--color-feriado-text)' }}>{feriado.descricao}</div>
                      )}
                      <div className="space-y-1">
                        {evs.map(ev => {
                          const st = tipoStyle[ev.tipo] ?? tipoStyle.outro
                          return (
                            <button
                              key={ev.id}
                              onClick={() => setEventoAberto(ev)}
                              className="w-full text-left rounded px-1.5 py-1 transition-opacity hover:opacity-80"
                              style={{ background: st.background, color: st.color, border: `1px solid ${st.border}` }}
                            >
                              <div className="text-xs font-semibold">{horaEvento(ev.data_hora)}</div>
                              <div className="text-xs leading-tight truncate">{ev.paciente?.nome.split(' ')[0] ?? ev.titulo}</div>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {view === 'mes' && (
              <div>
                <div
                  className="grid mb-1"
                  style={{ gridTemplateColumns: `repeat(${mesColunas}, 1fr)` }}
                >
                  {['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'].slice(0, mesColunas).map(d => (
                    <div key={d} className="text-center text-xs font-medium py-1" style={{ color: 'var(--color-ink-faint)' }}>{d}</div>
                  ))}
                </div>
                <div
                  className="grid rounded-xl overflow-hidden"
                  style={{ gridTemplateColumns: `repeat(${mesColunas}, 1fr)`, gap: '1px', background: 'var(--color-border-soft)' }}
                >
                  {calDays.map((day, i) => {
                    if (!day) return <div key={i} className="h-20" style={{ background: 'var(--color-canvas)' }} />
                    const evs = getEventosForDate(day, eventosFiltrados)
                    const feriado = getFeriadoForDate(day, feriadosFiltrados)
                    const hoje = isToday(day)
                    const fimDeSemana = isWeekend(day)
                    return (
                      <div
                        key={i}
                        className="p-1.5 min-h-[5rem]"
                        style={{ background: hoje ? 'var(--color-today-bg)' : feriado ? 'var(--color-feriado-bg)' : fimDeSemana ? 'var(--color-canvas)' : 'var(--color-warm-white)' }}
                      >
                        <div
                          className="text-xs font-bold mb-1"
                          style={{ color: hoje ? 'var(--color-today-text)' : feriado ? 'var(--color-feriado-text)' : fimDeSemana ? 'var(--color-border)' : 'var(--color-ink-soft)' }}
                        >
                          {day.getDate()}
                          {feriado && <span className="ml-1" style={{ color: 'var(--color-feriado-soft)' }}>•</span>}
                        </div>
                        <div className="space-y-0.5">
                          {evs.slice(0, 2).map(ev => {
                            const st = tipoStyle[ev.tipo] ?? tipoStyle.outro
                            return (
                              <button
                                key={ev.id}
                                onClick={() => setEventoAberto(ev)}
                                className="w-full text-left text-xs px-1 rounded truncate transition-opacity hover:opacity-80"
                                style={{ background: st.background, color: st.color }}
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
                {feriadosFiltrados
                  .filter(f => {
                    const d = new Date(f.data + 'T12:00:00')
                    return d.getFullYear() === mesAno.getFullYear() && d.getMonth() === mesAno.getMonth() && (mostrarFimSemana || !isWeekend(d))
                  })
                  .map(f => (
                    <div key={f.data} className="mt-2 text-xs" style={{ color: 'var(--color-feriado-text)' }}>
                      • {new Date(f.data + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })} — {f.descricao}
                    </div>
                  ))}
              </div>
            )}

            {view === 'programacao' && (
              <ViewProgramacao
                dataBase={dataBase}
                eventos={eventosFiltrados}
                feriados={feriadosFiltrados}
                mostrarFimSemana={mostrarFimSemana}
                onEventClick={setEventoAberto}
              />
            )}
          </div>
        </div>
      </div>

      {/* ── FAB ──────────────────────────────────────────────────────────────── */}
      <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-2">
        {fabAberto && (
          <div className="flex flex-col items-end gap-2 mb-1 animate-in fade-in slide-in-from-bottom-2">
            <button
              onClick={() => { setFabAberto(false); setBloqueioAberto(true) }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium shadow-lg transition-all hover:opacity-90 whitespace-nowrap"
              style={{ background: 'var(--color-warm-white)', color: 'var(--color-ink)', border: '1px solid var(--color-border)' }}
            >
              <Lock size={14} aria-hidden="true" />
              Bloquear horário
            </button>
          </div>
        )}
        <button
          onClick={() => setFabAberto(v => !v)}
          aria-label={fabAberto ? 'Fechar menu de ações' : 'Abrir menu de ações'}
          aria-expanded={fabAberto}
          className="w-12 h-12 rounded-full flex items-center justify-center text-white text-2xl shadow-lg transition-all hover:opacity-90 hover:scale-105"
          style={{ background: 'var(--color-rose-main)' }}
        >
          {fabAberto ? '×' : '+'}
        </button>
      </div>

      {/* ── Modal: todos eventos do dia ───────────────────────────────────────── */}
      {diaAberto && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 p-4"
          style={{ background: 'rgba(44,32,24,0.4)' }}
          onClick={() => setDiaAberto(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-dia-titulo"
            className="rounded-2xl p-5 max-w-sm w-full space-y-3 max-h-[80vh] overflow-y-auto"
            style={{ background: 'var(--color-warm-white)', boxShadow: '0 20px 60px rgba(44,32,24,0.2)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 id="modal-dia-titulo" className="font-semibold" style={{ color: 'var(--color-ink)' }}>
                {new Date(diaAberto.dateStr + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
              </h3>
              <button onClick={() => setDiaAberto(null)} aria-label="Fechar" className="text-lg leading-none hover:opacity-60" style={{ color: 'var(--color-ink-faint)' }}>×</button>
            </div>
            <div className="space-y-2">
              {diaAberto.evs.map(ev => {
                const st = tipoStyle[ev.tipo] ?? tipoStyle.outro
                return (
                  <button
                    key={ev.id}
                    onClick={() => { setDiaAberto(null); setEventoAberto(ev) }}
                    className="w-full text-left rounded-xl px-3 py-2 transition-opacity hover:opacity-80"
                    style={{ background: st.background, border: `1px solid ${st.border}` }}
                  >
                    <div className="text-xs font-medium" style={{ color: st.color }}>{horaEvento(ev.data_hora)} · {tipoLabel[ev.tipo] ?? ev.tipo}</div>
                    <div className="text-sm" style={{ color: 'var(--color-ink)' }}>{ev.paciente?.nome ?? ev.titulo}</div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: detalhe do evento ──────────────────────────────────────────── */}
      {eventoAberto && (
        <ModalEvento
          evento={eventoAberto}
          onClose={() => setEventoAberto(null)}
          onEnviarWhatsApp={handleEnviarWhatsApp}
          onRemoverBloqueio={eventoAberto.tipo === 'bloqueio' ? handleRemoverBloqueio : undefined}
          waLoading={waLoading}
          waConfirmacao={waConfirmacao}
          removerBloqueioLoading={removerBloqueioLoading}
          removerBloqueioErro={removerBloqueioErro}
        />
      )}

      {/* ── Modal: criar bloqueio ─────────────────────────────────────────────── */}
      {bloqueioAberto && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 p-4"
          style={{ background: 'rgba(44,32,24,0.4)' }}
          onClick={limparBloqueio}
        >
          <form
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-bloqueio-titulo"
            onSubmit={handleVerificarBloqueio}
            className="rounded-2xl p-5 max-w-sm w-full space-y-4"
            style={{ background: 'var(--color-warm-white)', boxShadow: '0 20px 60px rgba(44,32,24,0.2)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 id="modal-bloqueio-titulo" className="font-semibold" style={{ color: 'var(--color-ink)' }}>Bloquear horário</h3>
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-ink-soft)' }}>
                  {formatarDataHora(toIsoBRT(bloqueioForm.data, bloqueioForm.hora))}
                </p>
              </div>
              <button type="button" onClick={limparBloqueio} aria-label="Fechar" className="text-lg leading-none transition-opacity hover:opacity-60" style={{ color: 'var(--color-ink-faint)' }}>×</button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="text-xs font-medium" style={{ color: 'var(--color-ink-soft)' }}>
                Data
                <input
                  type="date"
                  value={bloqueioForm.data}
                  min={localDateStr(new Date())}
                  onChange={e => setBloqueioForm(prev => ({ ...prev, data: e.target.value }))}
                  className="mt-1 w-full rounded-xl px-3 py-2 text-sm outline-none"
                  style={{ border: '1px solid var(--color-border)', background: 'var(--color-warm-white)', color: 'var(--color-ink)' }}
                  required
                />
              </label>
              <label className="text-xs font-medium" style={{ color: 'var(--color-ink-soft)' }}>
                Hora
                <input
                  type="time"
                  value={bloqueioForm.hora}
                  onChange={e => setBloqueioForm(prev => ({ ...prev, hora: e.target.value }))}
                  className="mt-1 w-full rounded-xl px-3 py-2 text-sm outline-none"
                  style={{ border: '1px solid var(--color-border)', background: 'var(--color-warm-white)', color: 'var(--color-ink)' }}
                  required
                />
              </label>
            </div>

            <label className="text-xs font-medium block" style={{ color: 'var(--color-ink-soft)' }}>
              Duração
              <select
                value={bloqueioForm.duracao}
                onChange={e => setBloqueioForm(prev => ({ ...prev, duracao: e.target.value }))}
                className="mt-1 w-full rounded-xl px-3 py-2 text-sm outline-none"
                style={{ border: '1px solid var(--color-border)', background: 'var(--color-warm-white)', color: 'var(--color-ink)' }}
              >
                <option value="30">30 minutos</option>
                <option value="45">45 minutos</option>
                <option value="50">50 minutos</option>
                <option value="60">60 minutos</option>
                <option value="90">90 minutos</option>
                <option value="120">120 minutos</option>
              </select>
            </label>

            <label className="text-xs font-medium block" style={{ color: 'var(--color-ink-soft)' }}>
              Motivo
              <input
                type="text"
                value={bloqueioForm.motivo}
                onChange={e => setBloqueioForm(prev => ({ ...prev, motivo: e.target.value }))}
                placeholder="Consulta, reunião, não atender"
                className="mt-1 w-full rounded-xl px-3 py-2 text-sm outline-none"
                style={{ border: '1px solid var(--color-border)', background: 'var(--color-warm-white)', color: 'var(--color-ink)' }}
              />
            </label>

            {bloqueioErro && (
              <div className="text-xs rounded-xl px-3 py-2" style={{ background: 'var(--color-feriado-bg)', color: 'var(--color-danger-text)', border: '1px solid #FECACA' }}>
                {bloqueioErro}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={limparBloqueio}
                className="px-3 py-2 rounded-xl text-sm font-medium transition-opacity hover:opacity-80"
                style={{ color: 'var(--color-ink-soft)', border: '1px solid var(--color-border)' }}
              >Cancelar</button>
              <button
                type="submit"
                disabled={bloqueioLoading}
                className="px-3 py-2 rounded-xl text-sm font-medium transition-opacity hover:opacity-85 disabled:opacity-50"
                style={{ color: '#fff', background: 'var(--color-rose-main)' }}
              >{bloqueioLoading ? 'Salvando...' : 'Salvar'}</button>
            </div>
          </form>
        </div>
      )}

      {/* ── Modal: conflito de bloqueio ───────────────────────────────────────── */}
      {bloqueioPendente && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 p-4"
          style={{ background: 'rgba(44,32,24,0.4)' }}
          onClick={limparBloqueio}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-conflito-titulo"
            className="rounded-2xl p-5 max-w-md w-full space-y-4 max-h-[85vh] overflow-y-auto"
            style={{ background: 'var(--color-warm-white)', boxShadow: '0 20px 60px rgba(44,32,24,0.2)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 id="modal-conflito-titulo" className="font-semibold" style={{ color: 'var(--color-ink)' }}>Horário ocupado</h3>
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-ink-soft)' }}>
                  {formatarDataHora(bloqueioPendente.payload.data_hora)}
                </p>
              </div>
              <button onClick={limparBloqueio} aria-label="Fechar" className="text-lg leading-none transition-opacity hover:opacity-60" style={{ color: 'var(--color-ink-faint)' }}>×</button>
            </div>

            <div className="space-y-2">
              {bloqueioPendente.conflitos.map(conf => (
                <div key={conf.id} className="rounded-xl px-3 py-2" style={{ background: 'var(--color-status-pendente-bg)', border: '1px solid var(--color-status-pendente-border)' }}>
                  <div className="text-xs font-medium" style={{ color: 'var(--color-amber-deep)' }}>
                    {formatarDataHora(conf.data_hora)} · {tipoLabel[conf.tipo] ?? conf.tipo}
                  </div>
                  <div className="text-sm" style={{ color: 'var(--color-ink)' }}>{conf.pacienteNome ?? conf.titulo}</div>
                  <div className="text-xs" style={{ color: 'var(--color-amber-mid)' }}>{conf.duracao_minutos} minutos</div>
                </div>
              ))}
            </div>

            {reposicaoAberta ? (
              <div className="space-y-3">
                <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-ink-soft)' }}>
                  Horários disponíveis
                </div>
                {bloqueioPendente.sugestoes.length > 0 ? (
                  <div className="grid gap-2">
                    {bloqueioPendente.sugestoes.map(s => {
                      const selected = reposicaoSlot === s.data_hora
                      return (
                        <button
                          key={s.data_hora}
                          type="button"
                          onClick={() => setReposicaoSlot(s.data_hora)}
                          className="w-full text-left rounded-xl px-3 py-2 text-sm transition-opacity hover:opacity-85"
                          style={{
                            background: selected ? 'var(--color-sage-light)' : 'var(--color-warm-white)',
                            border: selected ? '1px solid var(--color-sage-soft)' : '1px solid var(--color-border)',
                            color: selected ? 'var(--color-sage-deep)' : 'var(--color-ink-mid)',
                          }}
                        >
                          {formatarDataHora(s.data_hora)}
                        </button>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-sm rounded-xl px-3 py-2" style={{ background: 'var(--color-status-expirada-bg)', color: 'var(--color-status-expirada-text)' }}>
                    Nenhum horário disponível nos próximos dias.
                  </div>
                )}
                {bloqueioErro && (
                  <div className="text-xs rounded-xl px-3 py-2" style={{ background: 'var(--color-feriado-bg)', color: 'var(--color-danger-text)', border: '1px solid #FECACA' }}>
                    {bloqueioErro}
                  </div>
                )}
                <div className="flex justify-end gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setReposicaoAberta(false)}
                    className="px-3 py-2 rounded-xl text-sm font-medium transition-opacity hover:opacity-80"
                    style={{ color: 'var(--color-ink-soft)', border: '1px solid var(--color-border)' }}
                  >Voltar</button>
                  <button
                    type="button"
                    onClick={handleReposicaoBloqueio}
                    disabled={bloqueioLoading || !reposicaoSlot || bloqueioPendente.sugestoes.length === 0}
                    className="px-3 py-2 rounded-xl text-sm font-medium transition-opacity hover:opacity-85 disabled:opacity-50"
                    style={{ color: '#fff', background: 'var(--color-sage-main)' }}
                  >Salvar reposição</button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {bloqueioPendente.conflitos.length !== 1 && (
                  <div className="text-xs rounded-xl px-3 py-2" style={{ background: 'var(--color-status-expirada-bg)', color: 'var(--color-status-expirada-text)' }}>
                    Reposição automática disponível apenas para um atendimento por vez.
                  </div>
                )}
                {bloqueioErro && (
                  <div className="text-xs rounded-xl px-3 py-2" style={{ background: 'var(--color-feriado-bg)', color: 'var(--color-danger-text)', border: '1px solid #FECACA' }}>
                    {bloqueioErro}
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={handleConfirmarBloqueio}
                    disabled={bloqueioLoading}
                    className="px-3 py-2 rounded-xl text-xs font-bold transition-opacity hover:opacity-85 disabled:opacity-50"
                    style={{ color: '#fff', background: 'var(--color-rose-main)' }}
                  >CONFIRMAR</button>
                  <button
                    type="button"
                    onClick={() => setReposicaoAberta(true)}
                    disabled={bloqueioLoading || bloqueioPendente.conflitos.length !== 1 || !bloqueioPendente.conflitos[0]?.pacienteId || bloqueioPendente.sugestoes.length === 0}
                    className="px-3 py-2 rounded-xl text-xs font-bold transition-opacity hover:opacity-85 disabled:opacity-45"
                    style={{ color: '#fff', background: 'var(--color-sage-main)' }}
                  >REPOSIÇÃO</button>
                  <button
                    type="button"
                    onClick={limparBloqueio}
                    disabled={bloqueioLoading}
                    className="px-3 py-2 rounded-xl text-xs font-bold transition-opacity hover:opacity-80 disabled:opacity-50"
                    style={{ color: 'var(--color-ink-soft)', border: '1px solid var(--color-border)' }}
                  >CANCELAR</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
