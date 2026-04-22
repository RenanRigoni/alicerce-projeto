'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'

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

export default function ResponsaveisPage() {
  const [todos, setTodos] = useState<Responsavel[]>([])
  const [filtros, setFiltros] = useState<Set<StatusPaciente>>(new Set(['ativo']))
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    async function carregar() {
      setCarregando(true)
      const supabase = createClient()
      const { data } = await supabase
        .from('profiles')
        .select(`
          id, nome, ativo,
          responsaveis_detalhes(telefone_principal, cidade),
          paciente_responsaveis(tipo, pacientes(id, nome, codigo_interno, status))
        `)
        .eq('role', 'pai')
        .order('nome')

      setTodos((data ?? []).map((r: any) => ({
        id: r.id,
        nome: r.nome,
        ativo: r.ativo,
        telefone: r.responsaveis_detalhes?.telefone_principal ?? null,
        cidade: r.responsaveis_detalhes?.cidade ?? null,
        pacientes: (r.paciente_responsaveis ?? [])
          .filter((pr: any) => pr.pacientes)
          .map((pr: any) => ({
            id: pr.pacientes.id,
            nome: pr.pacientes.nome,
            codigo_interno: pr.pacientes.codigo_interno,
            status: pr.pacientes.status,
          })),
      })))
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

  // Filtra responsáveis e seus pacientes conforme filtros ativos
  const lista = todos
    .map(r => ({
      ...r,
      pacientes: r.pacientes.filter(p => filtros.has(p.status)),
    }))
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
          {/* Filtros */}
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
          <a
            href="/admin/usuarios/novo"
            className="text-sm font-medium px-4 py-2 rounded-xl transition-all duration-200"
            style={{ background: 'var(--color-rose-blush)', color: 'var(--color-rose-deep)' }}
          >
            + Novo responsável
          </a>
        </div>
      </div>

      {carregando ? (
        <Card>
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" style={{ color: 'var(--color-rose-soft)' }}>
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span className="text-sm" style={{ color: 'var(--color-ink-soft)' }}>Carregando...</span>
          </div>
        </Card>
      ) : lista.length === 0 ? (
        <Card>
          <p className="text-sm" style={{ color: 'var(--color-ink-faint)' }}>Nenhum responsável encontrado.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {lista.map(r => (
            <Card key={r.id}>
              <div className="flex items-start justify-between gap-4 flex-wrap">
                {/* Info do responsável */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium" style={{ color: 'var(--color-ink)' }}>{r.nome}</span>
                    {!r.ativo && <Badge color="gray">Inativo</Badge>}
                  </div>
                  <div className="flex flex-wrap gap-x-4 mt-0.5">
                    {r.telefone && <span className="text-sm" style={{ color: 'var(--color-ink-soft)' }}>{r.telefone}</span>}
                    {r.cidade && <span className="text-sm" style={{ color: 'var(--color-ink-soft)' }}>{r.cidade}</span>}
                  </div>
                </div>

                {/* Pacientes vinculados — um abaixo do outro */}
                <div className="flex flex-col gap-1.5 items-end">
                  {r.pacientes.map(p => (
                    <a
                      key={p.id}
                      href={`/admin/pacientes/${p.id}`}
                      className="flex items-center gap-1.5 text-sm transition-opacity hover:opacity-70"
                      style={{ color: 'var(--color-ink-mid)', textDecoration: 'none' }}
                    >
                      {p.codigo_interno && (
                        <span className="text-xs font-mono" style={{ color: 'var(--color-ink-faint)' }}>
                          #{p.codigo_interno}
                        </span>
                      )}
                      <span>{p.nome}</span>
                      <Badge color={statusColor[p.status]}>{statusLabel[p.status]}</Badge>
                    </a>
                  ))}
                </div>
              </div>

              <div className="mt-3 pt-3 border-t flex justify-end" style={{ borderColor: 'var(--color-border-soft)' }}>
                <a
                  href={`/admin/usuarios/${r.id}`}
                  className="text-xs transition-opacity hover:opacity-70"
                  style={{ color: 'var(--color-rose-main)' }}
                >
                  Ver perfil completo →
                </a>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
