'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'

type StatusPaciente = 'ativo' | 'alta' | 'desativado'

const statusLabel: Record<StatusPaciente, string> = { ativo: 'Ativo', alta: 'Alta', desativado: 'Inativo' }
const statusColor: Record<StatusPaciente, 'green' | 'blue' | 'rose'> = { ativo: 'green', alta: 'blue', desativado: 'rose' }

interface Responsavel {
  id: string
  nome: string
  telefone: string | null
  cidade: string | null
  pacientes: Array<{ id: string; nome: string; status: StatusPaciente }>
}

export default function TerapiaResponsaveisPage() {
  const [todos, setTodos] = useState<Responsavel[]>([])
  const [filtros, setFiltros] = useState<Set<StatusPaciente>>(new Set(['ativo']))
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    async function carregar() {
      setCarregando(true)
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      const { data: vinculos } = await supabase
        .from('paciente_terapeutas')
        .select('pacientes(id, nome, status, paciente_responsaveis(tipo, profiles(id, nome, responsaveis_detalhes(telefone_principal, cidade))))')
        .eq('terapeuta_id', user!.id)

      const responsaveisMap = new Map<string, Responsavel>()

      for (const vinculo of (vinculos ?? [])) {
        const paciente = (vinculo as any).pacientes
        if (!paciente) continue
        for (const pr of (paciente.paciente_responsaveis ?? [])) {
          if (!pr.profiles) continue
          const resp = pr.profiles
          if (!responsaveisMap.has(resp.id)) {
            responsaveisMap.set(resp.id, {
              id: resp.id,
              nome: resp.nome,
              telefone: resp.responsaveis_detalhes?.telefone_principal ?? null,
              cidade: resp.responsaveis_detalhes?.cidade ?? null,
              pacientes: [],
            })
          }
          const entry = responsaveisMap.get(resp.id)!
          if (!entry.pacientes.find(p => p.id === paciente.id)) {
            entry.pacientes.push({ id: paciente.id, nome: paciente.nome, status: paciente.status })
          }
        }
      }

      setTodos(Array.from(responsaveisMap.values()).sort((a, b) => a.nome.localeCompare(b.nome)))
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
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-ink-soft)' }}>
            {lista.length} responsável{lista.length !== 1 ? 'is' : ''} encontrado{lista.length !== 1 ? 's' : ''}
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

      {carregando ? (
        <Card>
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" style={{ color: 'var(--color-sage-soft)' }}>
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span className="text-sm" style={{ color: 'var(--color-ink-soft)' }}>Carregando...</span>
          </div>
        </Card>
      ) : lista.length === 0 ? (
        <Card>
          <p className="text-sm" style={{ color: 'var(--color-ink-faint)' }}>Nenhum responsável encontrado para os filtros selecionados.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {lista.map(r => (
            <Card key={r.id}>
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  <a
                    href={`/terapia/responsavel/${r.id}`}
                    className="font-medium transition-opacity hover:opacity-70"
                    style={{ color: 'var(--color-ink)' }}
                  >
                    {r.nome}
                  </a>
                  <div className="flex flex-wrap gap-x-4 mt-0.5">
                    {r.telefone && <span className="text-sm" style={{ color: 'var(--color-ink-soft)' }}>{r.telefone}</span>}
                    {r.cidade && <span className="text-sm" style={{ color: 'var(--color-ink-soft)' }}>{r.cidade}</span>}
                  </div>
                </div>
                <div className="flex flex-col gap-1.5 items-end">
                  {r.pacientes.map(p => (
                    <a
                      key={p.id}
                      href={`/terapia/paciente/${p.id}`}
                      className="flex items-center gap-1.5 text-sm transition-opacity hover:opacity-70"
                      style={{ color: 'var(--color-ink-mid)', textDecoration: 'none' }}
                    >
                      <span>{p.nome}</span>
                      <Badge color={statusColor[p.status] ?? 'gray'}>{statusLabel[p.status] ?? p.status}</Badge>
                    </a>
                  ))}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
