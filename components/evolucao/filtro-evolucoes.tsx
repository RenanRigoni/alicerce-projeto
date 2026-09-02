'use client'

import { useMemo, useState } from 'react'
import {
  filtrarEvolucoes,
  listarProfissionais,
  listarProfissoes,
  type AutorEvolucao,
  type OpcaoFiltro,
} from '@/lib/evolucao'

export { autoriaEvolucao } from '@/lib/evolucao'
export type { AutorEvolucao, OpcaoFiltro } from '@/lib/evolucao'

// ── Hook ─────────────────────────────────────────────────────

function toggleSet(set: Set<string>, value: string): Set<string> {
  const next = new Set(set)
  if (next.has(value)) next.delete(value)
  else next.add(value)
  return next
}

export function useFiltroEvolucoes<T extends AutorEvolucao>(evolucoes: T[]) {
  const [profSel, setProfSel] = useState<Set<string>>(new Set())
  const [tipoSel, setTipoSel] = useState<Set<string>>(new Set())

  const profissionais = useMemo(() => listarProfissionais(evolucoes), [evolucoes])
  const tipos = useMemo(() => listarProfissoes(evolucoes), [evolucoes])

  const evolucoesFiltradas = useMemo(
    () => filtrarEvolucoes(evolucoes, profSel, tipoSel),
    [evolucoes, profSel, tipoSel],
  )

  const mostrarFiltro = profissionais.length > 1 || tipos.length > 1

  return {
    profSel,
    tipoSel,
    profissionais,
    tipos,
    evolucoesFiltradas,
    mostrarFiltro,
    alternarProf: (value: string) => setProfSel(s => toggleSet(s, value)),
    alternarTipo: (value: string) => setTipoSel(s => toggleSet(s, value)),
    limparProf: () => setProfSel(new Set()),
    limparTipo: () => setTipoSel(new Set()),
  }
}

// ── Componente de UI ─────────────────────────────────────────

interface GrupoProps {
  titulo: string
  opcoes: OpcaoFiltro[]
  selecionados: Set<string>
  onAlternar: (value: string) => void
  onLimpar: () => void
}

function GrupoFiltro({ titulo, opcoes, selecionados, onAlternar, onLimpar }: GrupoProps) {
  const chipBase = 'text-xs font-medium px-3 py-1 rounded-full transition-colors'
  const estilo = (ativo: boolean) =>
    ativo
      ? { background: 'var(--color-rose-main)', color: 'white' }
      : { border: '1px solid var(--color-border)', color: 'var(--color-ink-mid)' }
  return (
    <div>
      <div className="text-xs uppercase tracking-wide mb-1.5" style={{ color: 'var(--color-ink-faint)' }}>
        {titulo}
      </div>
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={onLimpar}
          aria-pressed={selecionados.size === 0}
          className={chipBase}
          style={estilo(selecionados.size === 0)}
        >
          Todos
        </button>
        {opcoes.map(op => (
          <button
            key={op.value}
            type="button"
            onClick={() => onAlternar(op.value)}
            aria-pressed={selecionados.has(op.value)}
            className={chipBase}
            style={estilo(selecionados.has(op.value))}
          >
            {op.label}
          </button>
        ))}
      </div>
    </div>
  )
}

interface FiltroProps {
  profissionais: OpcaoFiltro[]
  tipos: OpcaoFiltro[]
  profSel: Set<string>
  tipoSel: Set<string>
  onAlternarProf: (value: string) => void
  onAlternarTipo: (value: string) => void
  onLimparProf: () => void
  onLimparTipo: () => void
}

export function FiltroEvolucoes({
  profissionais, tipos, profSel, tipoSel,
  onAlternarProf, onAlternarTipo, onLimparProf, onLimparTipo,
}: FiltroProps) {
  return (
    <div
      className="rounded-2xl p-3 space-y-3"
      style={{ background: 'var(--color-warm-white)', border: '1px solid var(--color-border)' }}
    >
      {profissionais.length > 1 && (
        <GrupoFiltro
          titulo="Profissional"
          opcoes={profissionais}
          selecionados={profSel}
          onAlternar={onAlternarProf}
          onLimpar={onLimparProf}
        />
      )}
      {tipos.length > 1 && (
        <GrupoFiltro
          titulo="Profissão"
          opcoes={tipos}
          selecionados={tipoSel}
          onAlternar={onAlternarTipo}
          onLimpar={onLimparTipo}
        />
      )}
    </div>
  )
}
