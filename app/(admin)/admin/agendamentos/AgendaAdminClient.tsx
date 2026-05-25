'use client'

import { useState, useMemo, useCallback } from 'react'
import { CalendarioAgenda, type EventoAgenda } from '@/components/terapia/CalendarioAgenda'
import { AgendamentosLista, type AgendamentoItem } from '@/components/admin/AgendamentosLista'
import { Card } from '@/components/ui/Card'

interface Feriado { data: string; descricao: string }

interface ItemPassado {
  id: string
  titulo: string
  data_hora: string
  pacientes: { nome: string } | null
  profiles: { nome: string } | null
}

interface Props {
  eventos: EventoAgenda[]
  feriados: Feriado[]
  proximos: AgendamentoItem[]
  terapeutasFiltro: Array<{ id: string; nome: string }>
  passados: ItemPassado[]
}

function formatarDataHora(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })
    + ' · ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

export function AgendaAdminClient({ eventos, feriados, proximos, terapeutasFiltro, passados }: Props) {
  const [filtroTerapeutaId, setFiltroTerapeutaId] = useState('todos')
  const [filtroPacienteId, setFiltroPacienteId] = useState('todos')

  const handleFiltroChange = useCallback((terapeutaId: string, pacienteId: string) => {
    setFiltroTerapeutaId(terapeutaId)
    setFiltroPacienteId(pacienteId)
  }, [])

  const proximosFiltrados = useMemo(() => {
    return proximos.filter(a => {
      if (filtroTerapeutaId !== 'todos' && a.terapeutaId !== filtroTerapeutaId) return false
      if (filtroPacienteId !== 'todos' && a.pacienteId !== filtroPacienteId) return false
      return true
    })
  }, [proximos, filtroTerapeutaId, filtroPacienteId])

  const { porDia, diasOrdenados } = useMemo(() => {
    const pDia: Record<string, AgendamentoItem[]> = {}
    for (const a of proximosFiltrados) {
      const dia = a.data_hora.slice(0, 10)
      if (!pDia[dia]) pDia[dia] = []
      pDia[dia].push(a)
    }
    return { porDia: pDia, diasOrdenados: Object.keys(pDia).sort() }
  }, [proximosFiltrados])

  const nomeFiltroProfissional = filtroTerapeutaId !== 'todos'
    ? (terapeutasFiltro.find(t => t.id === filtroTerapeutaId)?.nome.split(' ')[0] ?? '')
    : null

  return (
    <>
      <CalendarioAgenda
        eventos={eventos}
        feriados={feriados}
        pacienteHref="/admin/pacientes"
        hideFab
        terapeutasFiltro={terapeutasFiltro}
        onFiltroChange={handleFiltroChange}
      />

      {/* Lista próximos 14 dias */}
      <div
        className="pt-6"
        style={{ borderTop: '1px solid var(--color-border-soft)' }}
      >
        <div className="mb-4">
          <h2
            className="text-lg font-semibold"
            style={{ fontFamily: 'var(--font-lora)', color: 'var(--color-ink)' }}
          >
            Agendamentos
          </h2>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-ink-soft)' }}>
            Sessões e compromissos — próximos 14 dias
            {nomeFiltroProfissional && ` · ${nomeFiltroProfissional}`}
          </p>
        </div>

        <div className="space-y-4 max-w-3xl">
          <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-ink-soft)' }}>
            Próximos (14 dias)
          </h3>
          {diasOrdenados.length > 0 ? (
            <AgendamentosLista porDia={porDia} diasOrdenados={diasOrdenados} />
          ) : (
            <Card>
              <p className="text-sm" style={{ color: 'var(--color-ink-faint)' }}>
                Nenhum agendamento nos próximos 14 dias
                {nomeFiltroProfissional ? ` para ${nomeFiltroProfissional}` : ''}.
              </p>
            </Card>
          )}
        </div>

        {/* Histórico recente */}
        {passados.length > 0 && (
          <div className="space-y-3 mt-6 max-w-3xl">
            <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-ink-soft)' }}>
              Histórico recente
            </h3>
            <div
              className="rounded-2xl overflow-hidden"
              style={{ background: 'var(--color-warm-white)', border: '1px solid var(--color-border)' }}
            >
              {passados.map((a, i) => (
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
                      {a.profiles?.nome}
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
    </>
  )
}
