'use client'

import { useRouter } from 'next/navigation'
import { useState, useEffect, type FormEvent } from 'react'

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

const tipoStyle: Record<string, { background: string; color: string; border: string }> = {
  sessao:     { background: 'var(--color-rose-blush)',    color: 'var(--color-rose-deep)',     border: 'var(--color-rose-soft)' },
  devolutiva: { background: 'var(--color-lavender-light)', color: 'var(--color-lavender-main)', border: 'var(--color-lavender-soft)' },
  reuniao:    { background: '#EFF6FF',    color: '#1D4ED8',     border: '#BFDBFE' },
  reposicao:  { background: '#ECFDF5',    color: '#047857',     border: '#A7F3D0' },
  bloqueio:   { background: '#F3F4F6',    color: '#4B5563',     border: '#D1D5DB' },
  outro:      { background: 'var(--color-border-soft)',   color: 'var(--color-ink-mid)',       border: 'var(--color-border)' },
}

const tipoLabel: Record<string, string> = {
  sessao: 'Sessão', devolutiva: 'Devolutiva', reuniao: 'Reunião', reposicao: 'Reposição', bloqueio: 'Indisponível', outro: 'Outro',
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
  return `${d.toLocaleDateString('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
  })} · ${horaEvento(iso)}`
}

function IconeWhatsApp() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 00-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  )
}

export function CalendarioAgenda({ eventos, feriados }: Props) {
  const router = useRouter()
  const [view, setView] = useState<'semana' | 'mes'>('semana')
  const [dataBase, setDataBase] = useState(new Date())
  const [eventoAberto, setEventoAberto] = useState<EventoAgenda | null>(null)
  const [diaAberto, setDiaAberto] = useState<{ dateStr: string; evs: EventoAgenda[] } | null>(null)
  const [waLoading, setWaLoading] = useState(false)
  const [waConfirmacao, setWaConfirmacao] = useState<{ token: string; status: string } | null>(null)
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
      if (!res.ok) {
        setBloqueioErro(json.error ?? 'Erro ao salvar bloqueio.')
        return null
      }
      return json
    } catch {
      setBloqueioErro('Erro de conexao ao salvar bloqueio.')
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

  const confirmacaoStatus =
    waConfirmacao?.status ?? eventoAberto?.confirmacao?.status ?? null

  const podaEnviarWA =
    confirmacaoStatus === null ||
    confirmacaoStatus === 'cancelada' ||
    confirmacaoStatus === 'expirada' ||
    confirmacaoStatus === 'pendente'
  const podeEnviarConfirmacao =
    !!eventoAberto?.paciente && (eventoAberto.tipo === 'sessao' || eventoAberto.tipo === 'reposicao')

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

        <button
          onClick={() => setBloqueioAberto(true)}
          className="text-xs font-medium px-3 py-1.5 rounded-xl transition-opacity hover:opacity-85"
          style={{
            color: '#fff',
            background: 'var(--color-ink-mid)',
          }}
        >
          + Bloquear horário
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

      {/* Modal: criar bloqueio */}
      {bloqueioAberto && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 p-4"
          style={{ background: 'rgba(44,32,24,0.4)' }}
          onClick={limparBloqueio}
        >
          <form
            onSubmit={handleVerificarBloqueio}
            className="rounded-2xl p-5 max-w-sm w-full space-y-4"
            style={{ background: 'var(--color-warm-white)', boxShadow: '0 20px 60px rgba(44,32,24,0.2)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold" style={{ color: 'var(--color-ink)' }}>
                  Bloquear horário
                </h3>
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-ink-soft)' }}>
                  {formatarDataHora(toIsoBRT(bloqueioForm.data, bloqueioForm.hora))}
                </p>
              </div>
              <button
                type="button"
                onClick={limparBloqueio}
                className="text-lg leading-none transition-opacity hover:opacity-60"
                style={{ color: 'var(--color-ink-faint)' }}
              >
                ×
              </button>
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
              <div className="text-xs rounded-xl px-3 py-2" style={{ background: '#FEF2F2', color: '#B91C1C', border: '1px solid #FECACA' }}>
                {bloqueioErro}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={limparBloqueio}
                className="px-3 py-2 rounded-xl text-sm font-medium transition-opacity hover:opacity-80"
                style={{ color: 'var(--color-ink-soft)', border: '1px solid var(--color-border)' }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={bloqueioLoading}
                className="px-3 py-2 rounded-xl text-sm font-medium transition-opacity hover:opacity-85 disabled:opacity-50"
                style={{ color: '#fff', background: 'var(--color-rose-main)' }}
              >
                {bloqueioLoading ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: conflito no bloqueio */}
      {bloqueioPendente && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 p-4"
          style={{ background: 'rgba(44,32,24,0.4)' }}
          onClick={limparBloqueio}
        >
          <div
            className="rounded-2xl p-5 max-w-md w-full space-y-4 max-h-[85vh] overflow-y-auto"
            style={{ background: 'var(--color-warm-white)', boxShadow: '0 20px 60px rgba(44,32,24,0.2)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold" style={{ color: 'var(--color-ink)' }}>
                  Horário ocupado
                </h3>
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-ink-soft)' }}>
                  {formatarDataHora(bloqueioPendente.payload.data_hora)}
                </p>
              </div>
              <button
                onClick={limparBloqueio}
                className="text-lg leading-none transition-opacity hover:opacity-60"
                style={{ color: 'var(--color-ink-faint)' }}
              >
                ×
              </button>
            </div>

            <div className="space-y-2">
              {bloqueioPendente.conflitos.map(conf => (
                <div
                  key={conf.id}
                  className="rounded-xl px-3 py-2"
                  style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}
                >
                  <div className="text-xs font-medium" style={{ color: '#92400E' }}>
                    {formatarDataHora(conf.data_hora)} · {tipoLabel[conf.tipo] ?? conf.tipo}
                  </div>
                  <div className="text-sm" style={{ color: 'var(--color-ink)' }}>
                    {conf.pacienteNome ?? conf.titulo}
                  </div>
                  <div className="text-xs" style={{ color: '#B45309' }}>
                    {conf.duracao_minutos} minutos
                  </div>
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
                  <div className="text-sm rounded-xl px-3 py-2" style={{ background: '#F3F4F6', color: '#6B7280' }}>
                    Nenhum horário disponível nos próximos dias.
                  </div>
                )}

                {bloqueioErro && (
                  <div className="text-xs rounded-xl px-3 py-2" style={{ background: '#FEF2F2', color: '#B91C1C', border: '1px solid #FECACA' }}>
                    {bloqueioErro}
                  </div>
                )}

                <div className="flex justify-end gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setReposicaoAberta(false)}
                    className="px-3 py-2 rounded-xl text-sm font-medium transition-opacity hover:opacity-80"
                    style={{ color: 'var(--color-ink-soft)', border: '1px solid var(--color-border)' }}
                  >
                    Voltar
                  </button>
                  <button
                    type="button"
                    onClick={handleReposicaoBloqueio}
                    disabled={bloqueioLoading || !reposicaoSlot || bloqueioPendente.sugestoes.length === 0}
                    className="px-3 py-2 rounded-xl text-sm font-medium transition-opacity hover:opacity-85 disabled:opacity-50"
                    style={{ color: '#fff', background: 'var(--color-sage-main)' }}
                  >
                    Salvar reposição
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {bloqueioPendente.conflitos.length !== 1 && (
                  <div className="text-xs rounded-xl px-3 py-2" style={{ background: '#F3F4F6', color: '#6B7280' }}>
                    Reposição automática disponível apenas para um atendimento por vez.
                  </div>
                )}

                {bloqueioErro && (
                  <div className="text-xs rounded-xl px-3 py-2" style={{ background: '#FEF2F2', color: '#B91C1C', border: '1px solid #FECACA' }}>
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
                  >
                    CONFIRMAR
                  </button>
                  <button
                    type="button"
                    onClick={() => setReposicaoAberta(true)}
                    disabled={
                      bloqueioLoading ||
                      bloqueioPendente.conflitos.length !== 1 ||
                      !bloqueioPendente.conflitos[0]?.pacienteId ||
                      bloqueioPendente.sugestoes.length === 0
                    }
                    className="px-3 py-2 rounded-xl text-xs font-bold transition-opacity hover:opacity-85 disabled:opacity-45"
                    style={{ color: '#fff', background: 'var(--color-sage-main)' }}
                  >
                    REPOSIÇÃO
                  </button>
                  <button
                    type="button"
                    onClick={limparBloqueio}
                    disabled={bloqueioLoading}
                    className="px-3 py-2 rounded-xl text-xs font-bold transition-opacity hover:opacity-80 disabled:opacity-50"
                    style={{ color: 'var(--color-ink-soft)', border: '1px solid var(--color-border)' }}
                  >
                    CANCELAR
                  </button>
                </div>
              </div>
            )}
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
            {podeEnviarConfirmacao && (
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
