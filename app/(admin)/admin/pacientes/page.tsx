'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'

type StatusPaciente = 'ativo' | 'alta' | 'desativado'

interface Paciente {
  id: string
  nome: string
  codigo_interno: string | null
  status: StatusPaciente
  frequencia_atendimento: string | null
  criado_em: string
}

const statusLabel: Record<StatusPaciente, string> = {
  ativo: 'Ativo',
  alta: 'Alta',
  desativado: 'Inativo',
}
const statusColor: Record<StatusPaciente, 'green' | 'blue' | 'rose'> = {
  ativo: 'green',
  alta: 'blue',
  desativado: 'rose',
}

export default function PacientesPage() {
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [filtros, setFiltros] = useState<Set<StatusPaciente>>(new Set(['ativo']))
  const [carregando, setCarregando] = useState(true)

  function toggleFiltro(status: StatusPaciente) {
    setFiltros(prev => {
      const next = new Set(prev)
      if (next.has(status)) {
        next.delete(status)
      } else {
        next.add(status)
      }
      // Se ficou vazio, volta para padrão (ativo)
      if (next.size === 0) return new Set(['ativo'])
      return next
    })
  }

  useEffect(() => {
    async function carregar() {
      setCarregando(true)
      const supabase = createClient()
      const statusAtivos = Array.from(filtros)

      const { data } = await supabase
        .from('pacientes')
        .select('id, nome, codigo_interno, status, frequencia_atendimento, criado_em')
        .in('status', statusAtivos)
        .order('nome')

      setPacientes(data ?? [])
      setCarregando(false)
    }
    carregar()
  }, [filtros])

  const filtroLabel = filtros.size === 3
    ? 'Todos os pacientes'
    : Array.from(filtros).map(s => statusLabel[s]).join(' + ')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1
            className="text-2xl font-semibold"
            style={{ fontFamily: 'var(--font-lora)', color: 'var(--color-ink)' }}
          >
            Pacientes
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-ink-soft)' }}>
            {filtroLabel}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Filtros multi-select */}
          <div className="flex items-center gap-2">
            {(['ativo', 'desativado', 'alta'] as StatusPaciente[]).map(s => (
              <button
                key={s}
                onClick={() => toggleFiltro(s)}
                className="text-xs font-medium px-3 py-1.5 rounded-full border transition-all duration-150"
                style={filtros.has(s) ? {
                  background: s === 'ativo' ? 'var(--color-sage-light)' : s === 'alta' ? '#EFF6FF' : 'var(--color-rose-blush)',
                  color: s === 'ativo' ? 'var(--color-sage-deep)' : s === 'alta' ? '#1D4ED8' : 'var(--color-rose-deep)',
                  borderColor: s === 'ativo' ? 'var(--color-sage-soft)' : s === 'alta' ? '#BFDBFE' : 'var(--color-rose-muted)',
                } : {
                  background: 'transparent',
                  color: 'var(--color-ink-soft)',
                  borderColor: 'var(--color-border)',
                }}
              >
                {statusLabel[s]}
              </button>
            ))}
          </div>
          <a
            href="/admin/pacientes/novo"
            className="text-sm font-medium px-4 py-2 rounded-xl text-white transition-all duration-200 active:scale-[0.98]"
            style={{ background: 'var(--color-rose-main)' }}
          >
            + Novo paciente
          </a>
        </div>
      </div>

      <Card>
        {carregando ? (
          <div className="flex items-center gap-2 py-2">
            <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" style={{ color: 'var(--color-rose-soft)' }}>
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span className="text-sm" style={{ color: 'var(--color-ink-soft)' }}>Carregando...</span>
          </div>
        ) : pacientes.length > 0 ? (
          <ul className="divide-y" style={{ borderColor: 'var(--color-border-soft)' }}>
            {pacientes.map(p => (
              <li
                key={p.id}
                className="py-3 flex items-center justify-between gap-3 first:pt-0 last:pb-0"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {p.codigo_interno && (
                    <span className="text-xs font-mono flex-shrink-0" style={{ color: 'var(--color-ink-faint)' }}>
                      #{p.codigo_interno}
                    </span>
                  )}
                  <div className="min-w-0">
                    <div className="font-medium truncate" style={{ color: 'var(--color-ink)' }}>
                      {p.nome}
                    </div>
                    {p.frequencia_atendimento && (
                      <div className="text-xs" style={{ color: 'var(--color-ink-soft)' }}>
                        {p.frequencia_atendimento}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <Badge color={statusColor[p.status]}>{statusLabel[p.status]}</Badge>
                  <a
                    href={`/admin/pacientes/${p.id}`}
                    className="text-sm font-medium transition-colors hover:opacity-80"
                    style={{ color: 'var(--color-rose-main)' }}
                  >
                    Ver
                  </a>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm" style={{ color: 'var(--color-ink-faint)' }}>
            Nenhum paciente encontrado para os filtros selecionados.
          </p>
        )}
      </Card>
    </div>
  )
}
