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
  canceladasKeys?: string[]
  confirmacoesIniciais?: Record<string, { token: string; status: string }>
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

function IconeWA({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 00-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  )
}

function StatusBadge({ status }: { status: string }) {
  const configs: Record<string, { icon: string; color: string; label: string }> = {
    pendente:   { icon: '⏳', color: 'var(--color-status-pendente-text)',   label: 'Mensagem enviada — aguardando' },
    confirmada: { icon: '✅', color: 'var(--color-status-confirmada-text)', label: 'Confirmado pelo responsável' },
    expirada:   { icon: '⚠️', color: 'var(--color-status-expirada-text)',   label: 'Expirado — confirmado para cobrança' },
  }
  const c = configs[status]
  if (!c) return null
  return (
    <span title={c.label} className="text-sm leading-none select-none" style={{ color: c.color }}>
      {c.icon}
    </span>
  )
}

export function AgendaSemanalTerapeuta({ pacientes, feriadosDatas, canceladasKeys = [], confirmacoesIniciais = {} }: Props) {
  const [weekOffset, setWeekOffset] = useState(0)
  const [localConf, setLocalConf] = useState<Record<string, { token: string; status: string }>>({})
  const [loading, setLoading] = useState<Record<string, boolean>>({})

  const monday = getMondayOfWeek(weekOffset)
  const sunday = addDays(monday, 6)
  sunday.setHours(23, 59, 59, 999)

  const canceladasSet = new Set(canceladasKeys)

  const sessoes = gerarSessoes(pacientes, monday, sunday, feriadosDatas).filter(s => {
    if (!s.paciente) return true
    const key = `${s.paciente.id}_${s.data_hora.slice(0, 10)}_${s.data_hora.slice(11, 16)}`
    return !canceladasSet.has(key)
  })

  function getConf(s: typeof sessoes[0]) {
    if (!s.paciente) return null
    const key = `${s.paciente.id}_${s.data_hora.slice(0, 10)}_${s.data_hora.slice(11, 16)}`
    return localConf[key] ?? confirmacoesIniciais[key] ?? null
  }

  async function handleWA(s: typeof sessoes[0]) {
    if (!s.paciente) return
    const key = `${s.paciente.id}_${s.data_hora.slice(0, 10)}_${s.data_hora.slice(11, 16)}`
    setLoading(prev => ({ ...prev, [key]: true }))
    try {
      const res = await fetch('/api/sessao/confirmacao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paciente_id: s.paciente.id, data_hora: s.data_hora }),
      })
      const json = await res.json()
      if (res.ok && json.waUrl) {
        window.open(json.waUrl, '_blank', 'noopener,noreferrer')
        setLocalConf(prev => ({ ...prev, [key]: { token: json.token, status: json.status ?? 'pendente' } }))
      }
    } catch {
      // silent
    } finally {
      setLoading(prev => ({ ...prev, [key]: false }))
    }
  }

  // Agrupa por data
  const porDia: Record<string, typeof sessoes> = {}
  for (const s of sessoes) {
    const d = s.data_hora.slice(0, 10)
    if (!porDia[d]) porDia[d] = []
    porDia[d].push(s)
  }
  const diasOrdenados = Object.keys(porDia).sort()

  const estilo = weekOffset < 0
    ? { bg: '#FEF2F2', border: '#FECACA', cor: '#B91C1C', label: 'Semana anterior' }
    : weekOffset === 0
    ? { bg: 'var(--color-sage-light)', border: 'var(--color-sage-soft)', cor: 'var(--color-sage-deep)', label: 'Semana atual' }
    : { bg: '#EFF6FF', border: '#BFDBFE', cor: '#1D4ED8', label: 'Próxima semana' }

  const semanaLabel = `${monday.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} – ${sunday.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}`

  return (
    <div className="space-y-3">
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
                    const key = s.paciente ? `${s.paciente.id}_${s.data_hora.slice(0, 10)}_${s.data_hora.slice(11, 16)}` : null
                    const conf = getConf(s)
                    const isLoading = key ? (loading[key] ?? false) : false
                    const isSessao = s.tipo === 'sessao' && !!s.paciente
                    const podaEnviar = isSessao && (conf === null || conf?.status === 'expirada' || conf?.status === 'pendente')

                    return (
                      <div
                        key={s.id}
                        className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm"
                        style={{ background: estilo.bg, border: `1px solid ${estilo.border}` }}
                      >
                        <span className="font-medium tabular-nums flex-shrink-0" style={{ color: estilo.cor }}>
                          {hora}
                        </span>
                        <span className="flex-1 min-w-0 truncate" style={{ color: 'var(--color-ink)' }}>
                          {s.paciente?.nome ?? s.titulo}
                        </span>

                        {isSessao && (
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            {conf?.status && <StatusBadge status={conf.status} />}
                            {podaEnviar && (
                              <button
                                onClick={() => handleWA(s)}
                                disabled={isLoading}
                                title={conf?.status === 'pendente' ? 'Reenviar mensagem' : 'Enviar confirmação via WhatsApp'}
                                className="flex items-center justify-center rounded-lg transition-opacity hover:opacity-80 disabled:opacity-40"
                                style={{
                                  width: 26, height: 26,
                                  background: conf?.status === 'pendente' ? '#e5e7eb' : '#25D366',
                                  color: conf?.status === 'pendente' ? '#6b7280' : '#fff',
                                }}
                              >
                                {isLoading ? <span className="text-xs">…</span> : <IconeWA size={13} />}
                              </button>
                            )}
                          </div>
                        )}

                        <span className="text-xs flex-shrink-0" style={{ color: 'var(--color-ink-faint)' }}>
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
