'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'

type StatusPaciente = 'ativo' | 'alta' | 'desativado'

const statusLabel: Record<StatusPaciente, string> = { ativo: 'Ativo', alta: 'Alta', desativado: 'Inativo' }
const statusColor: Record<StatusPaciente, 'green' | 'blue' | 'rose'> = { ativo: 'green', alta: 'blue', desativado: 'rose' }

interface Paciente {
  id: string
  nome: string
  codigo_interno: string | null
  status: StatusPaciente
  frequencia_atendimento: string | null
}

export default function TerapiaPacientesPage() {
  const [todos, setTodos] = useState<Paciente[]>([])
  const [filtros, setFiltros] = useState<Set<StatusPaciente>>(new Set(['ativo']))
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    async function carregar() {
      setCarregando(true)
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      const { data: vinculos } = await supabase
        .from('paciente_terapeutas')
        .select('pacientes(id, nome, codigo_interno, status, frequencia_atendimento)')
        .eq('terapeuta_id', user!.id)

      const pacientes = (vinculos ?? [])
        .map((v: any) => v.pacientes)
        .filter(Boolean)
        .sort((a: any, b: any) => a.nome.localeCompare(b.nome))

      setTodos(pacientes)
      setCarregando(false)
    }
    carregar()
  }, [])

  function toggleFiltro(status: StatusPaciente) {
    setFiltros(prev => {
      const next = new Set(prev)
      if (next.has(status)) { next.delete(status) } else { next.add(status) }
      if (next.size === 0) return new Set(['ativo'])
      return next
    })
  }

  const lista = todos.filter(p => filtros.has(p.status))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold" style={{ fontFamily: 'var(--font-lora)', color: 'var(--color-ink)' }}>
            Meus pacientes
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-ink-soft)' }}>
            {lista.length} paciente{lista.length !== 1 ? 's' : ''} encontrado{lista.length !== 1 ? 's' : ''}
          </p>
        </div>
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
                background: 'transparent', color: 'var(--color-ink-soft)', borderColor: 'var(--color-border)',
              }}
            >
              {statusLabel[s]}
            </button>
          ))}
        </div>
      </div>

      <Card>
        {carregando ? (
          <div className="flex items-center gap-2 py-2">
            <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" style={{ color: 'var(--color-sage-soft)' }}>
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span className="text-sm" style={{ color: 'var(--color-ink-soft)' }}>Carregando...</span>
          </div>
        ) : lista.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--color-ink-faint)' }}>Nenhum paciente encontrado para os filtros selecionados.</p>
        ) : (
          <ul className="divide-y" style={{ borderColor: 'var(--color-border-soft)' }}>
            {lista.map(p => (
              <li key={p.id} className="py-3 flex items-center justify-between gap-3 first:pt-0 last:pb-0">
                <div className="flex items-center gap-3 min-w-0">
                  {p.codigo_interno && (
                    <span className="text-xs font-mono flex-shrink-0" style={{ color: 'var(--color-ink-faint)' }}>
                      #{p.codigo_interno}
                    </span>
                  )}
                  <div className="min-w-0">
                    <div className="font-medium truncate" style={{ color: 'var(--color-ink)' }}>{p.nome}</div>
                    {p.frequencia_atendimento && (
                      <div className="text-xs" style={{ color: 'var(--color-ink-soft)' }}>{p.frequencia_atendimento}</div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <Badge color={statusColor[p.status] ?? 'gray'}>{statusLabel[p.status] ?? p.status}</Badge>
                  <a
                    href={`/terapia/paciente/${p.id}`}
                    className="text-sm font-medium transition-colors hover:opacity-80"
                    style={{ color: 'var(--color-sage-main)' }}
                  >
                    Ver
                  </a>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
