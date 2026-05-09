'use client'

import { useState } from 'react'

export interface AgendamentoItem {
  id: string
  tipo: string
  titulo: string
  motivo: string | null
  data_hora: string
  duracao_minutos: number
  pacienteId: string | null
  pacienteNome: string | null
  terapeutaNome: string | null
  visivel_responsavel: boolean
  confirmacao: { token: string; status: string } | null
}

interface Props {
  porDia: Record<string, AgendamentoItem[]>
  diasOrdenados: string[]
}

const tipoLabel: Record<string, string> = {
  sessao: 'Sessão', devolutiva: 'Devolutiva', reuniao: 'Reunião', outro: 'Outro',
}

const tipoStyle: Record<string, { background: string; color: string }> = {
  sessao:     { background: 'var(--color-rose-blush)',     color: 'var(--color-rose-deep)' },
  devolutiva: { background: 'var(--color-lavender-light)', color: 'var(--color-lavender-main)' },
  reuniao:    { background: 'var(--color-sage-light)',     color: 'var(--color-sage-deep)' },
  outro:      { background: 'var(--color-border-soft)',    color: 'var(--color-ink-mid)' },
}

const DIAS_PT = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado']

function formatarHora(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function formatarCabecalhoDia(dateStr: string) {
  const d = new Date(dateStr + 'T12:00:00')
  const diaSemana = DIAS_PT[d.getDay()]
  const data = d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
  return `${diaSemana} · ${data}`
}

function IconeWA({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 00-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  )
}

function StatusBadge({ status }: { status: string }) {
  const configs: Record<string, { icon: string; color: string; label: string }> = {
    pendente:   { icon: '⏳', color: '#b45309', label: 'Mensagem enviada — aguardando' },
    confirmada: { icon: '✅', color: '#15803d', label: 'Confirmado pelo responsável' },
    cancelada:  { icon: '❌', color: '#dc2626', label: 'Cancelado pelo responsável' },
    expirada:   { icon: '⚠️', color: '#6b7280', label: 'Expirado — confirmado para cobrança' },
  }
  const c = configs[status]
  if (!c) return null
  return (
    <span title={c.label} className="text-sm leading-none select-none" style={{ color: c.color }}>
      {c.icon}
    </span>
  )
}

export function AgendamentosLista({ porDia, diasOrdenados }: Props) {
  // Mapa local: itemId → confirmacao (para atualizações otimistas)
  const [localConf, setLocalConf] = useState<Record<string, { token: string; status: string }>>({})
  const [loading, setLoading] = useState<Record<string, boolean>>({})

  async function handleWA(item: AgendamentoItem) {
    if (!item.pacienteId) return
    setLoading(prev => ({ ...prev, [item.id]: true }))
    try {
      const res = await fetch('/api/sessao/confirmacao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paciente_id: item.pacienteId, data_hora: item.data_hora }),
      })
      const json = await res.json()
      if (res.ok && json.waUrl) {
        window.open(json.waUrl, '_blank', 'noopener,noreferrer')
        setLocalConf(prev => ({ ...prev, [item.id]: { token: json.token, status: json.status ?? 'pendente' } }))
      }
    } catch {
      // silent
    } finally {
      setLoading(prev => ({ ...prev, [item.id]: false }))
    }
  }

  function getConf(item: AgendamentoItem) {
    return localConf[item.id] ?? item.confirmacao
  }

  return (
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
            {porDia[dateStr].map((a, i) => {
              const conf = getConf(a)
              const isLoading = loading[a.id] ?? false
              const isSessao = a.tipo === 'sessao' && !!a.pacienteId
              const podaEnviar = isSessao && (
                conf === null || conf?.status === 'cancelada' || conf?.status === 'expirada' || conf?.status === 'pendente'
              )
              const status = conf?.status ?? null

              return (
                <div
                  key={a.id}
                  className="px-4 py-3 flex items-start gap-3"
                  style={{ borderTop: i > 0 ? '1px solid var(--color-border-soft)' : 'none' }}
                >
                  {/* Info principal */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0"
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

                  {/* Ações de confirmação (apenas sessões) */}
                  {isSessao && (
                    <div className="flex items-center gap-1.5 flex-shrink-0 mt-0.5">
                      {/* Ícone de status */}
                      {status && <StatusBadge status={status} />}

                      {/* Botão WhatsApp */}
                      {podaEnviar && (
                        <button
                          onClick={() => handleWA(a)}
                          disabled={isLoading}
                          title={status === 'pendente' ? 'Reenviar mensagem' : 'Enviar confirmação via WhatsApp'}
                          className="flex items-center justify-center rounded-lg transition-opacity hover:opacity-80 disabled:opacity-40"
                          style={{
                            width: 28,
                            height: 28,
                            background: status === 'pendente' ? '#e5e7eb' : '#25D366',
                            color: status === 'pendente' ? '#6b7280' : '#fff',
                          }}
                        >
                          {isLoading
                            ? <span className="text-xs">…</span>
                            : <IconeWA size={14} />
                          }
                        </button>
                      )}
                    </div>
                  )}

                  {/* Hora + duração */}
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
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
