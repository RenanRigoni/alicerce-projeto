'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'

type StatusPaciente = 'ativo' | 'alta' | 'desativado'
const statusLabel: Record<StatusPaciente, string> = { ativo: 'Ativo', alta: 'Alta', desativado: 'Inativo' }
const statusColor: Record<StatusPaciente, 'green' | 'blue' | 'rose'> = { ativo: 'green', alta: 'blue', desativado: 'rose' }

interface Responsavel {
  id: string
  nome: string
  ativo: boolean
  telefone: string | null
  cidade: string | null
  pacientes: Array<{ id: string; nome: string; codigo_interno: string | null; status: StatusPaciente }>
}

export function ResponsaveisLista({ todos }: { todos: Responsavel[] }) {
  const [filtros, setFiltros] = useState<Set<StatusPaciente>>(new Set(['ativo']))

  function toggleFiltro(status: StatusPaciente) {
    setFiltros(prev => {
      const next = new Set(prev)
      if (next.has(status)) { next.delete(status) } else { next.add(status) }
      if (next.size === 0) return new Set(['ativo'])
      return next
    })
  }

  const lista = todos
    .map(r => ({ ...r, pacientes: r.pacientes.filter(p => filtros.has(p.status)) }))
    .filter(r => r.pacientes.length > 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold" style={{ fontFamily: 'var(--font-lora)', color: 'var(--color-ink)' }}>
            Responsáveis
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-ink-soft)' }}>
            {lista.length} responsável{lista.length !== 1 ? 'is' : ''} encontrado{lista.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
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
          <Link
            href="/admin/usuarios/novo"
            className="text-sm font-medium px-4 py-2 rounded-xl transition-all duration-200"
            style={{ background: 'var(--color-rose-blush)', color: 'var(--color-rose-deep)' }}
          >
            + Novo responsável
          </Link>
        </div>
      </div>

      {lista.length === 0 ? (
        <Card>
          <p className="text-sm" style={{ color: 'var(--color-ink-faint)' }}>Nenhum responsável encontrado.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {lista.map(r => (
            <Card key={r.id}>
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link
                      href={`/admin/usuarios/${r.id}`}
                      className="font-medium transition-opacity hover:opacity-70"
                      style={{ color: 'var(--color-ink)' }}
                    >
                      {r.nome}
                    </Link>
                    {!r.ativo && <Badge color="gray">Inativo</Badge>}
                  </div>
                  <div className="flex flex-wrap gap-x-4 mt-0.5">
                    {r.telefone && <span className="text-sm" style={{ color: 'var(--color-ink-soft)' }}>{r.telefone}</span>}
                    {r.cidade && <span className="text-sm" style={{ color: 'var(--color-ink-soft)' }}>{r.cidade}</span>}
                  </div>
                </div>
                <div className="flex flex-col gap-1.5 items-end">
                  {r.pacientes.map(p => (
                    <Link
                      key={p.id}
                      href={`/admin/pacientes/${p.id}`}
                      className="flex items-center gap-1.5 text-sm transition-opacity hover:opacity-70"
                      style={{ color: 'var(--color-ink-mid)', textDecoration: 'none' }}
                    >
                      {p.codigo_interno && (
                        <span className="text-xs font-mono" style={{ color: 'var(--color-ink-faint)' }}>#{p.codigo_interno}</span>
                      )}
                      <span>{p.nome}</span>
                      <Badge color={statusColor[p.status]}>{statusLabel[p.status]}</Badge>
                    </Link>
                  ))}
                </div>
              </div>
              <div className="mt-3 pt-3 border-t flex justify-end" style={{ borderColor: 'var(--color-border-soft)' }}>
                <Link href={`/admin/usuarios/${r.id}`} className="text-xs transition-opacity hover:opacity-70" style={{ color: 'var(--color-rose-main)' }}>
                  Ver perfil completo →
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
