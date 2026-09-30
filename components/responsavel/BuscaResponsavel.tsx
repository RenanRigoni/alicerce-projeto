'use client'

import { useEffect, useState } from 'react'
import type { ResponsavelBusca } from '@/app/api/responsavel/buscar/route'

export type ResponsavelSelecionado = Pick<ResponsavelBusca, 'id' | 'nome'>

interface Props {
  valor: ResponsavelSelecionado | null
  onSelecionar: (responsavel: ResponsavelSelecionado | null) => void
  /** Já vinculados: aparecem na busca, mas desabilitados. */
  excluirIds?: string[]
  onPedirCadastro?: () => void
}

const TAMANHO_MINIMO_BUSCA = 3
const ATRASO_BUSCA_MS = 300

function textoFilhos(total: number): string {
  if (total === 0) return 'sem pacientes vinculados'
  return total === 1 ? '1 paciente vinculado' : `${total} pacientes vinculados`
}

export function BuscaResponsavel({ valor, onSelecionar, excluirIds = [], onPedirCadastro }: Props) {
  const [termo, setTermo] = useState('')
  const [resultados, setResultados] = useState<ResponsavelBusca[]>([])
  const [buscando, setBuscando] = useState(false)
  const [erro, setErro] = useState('')

  const termoAtivo = termo.trim().length >= TAMANHO_MINIMO_BUSCA

  useEffect(() => {
    if (!termoAtivo) return

    const controller = new AbortController()
    const timer = setTimeout(async () => {
      setBuscando(true)
      setErro('')
      try {
        const res = await fetch(`/api/responsavel/buscar?q=${encodeURIComponent(termo.trim())}`, {
          signal: controller.signal,
        })
        if (!res.ok) throw new Error('falha')
        const json = await res.json() as { resultados: ResponsavelBusca[] }
        setResultados(json.resultados)
        setBuscando(false)
      } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') return
        setErro('Não foi possível buscar agora. Tente de novo.')
        setResultados([])
        setBuscando(false)
      }
    }, ATRASO_BUSCA_MS)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [termo, termoAtivo])

  if (valor) {
    return (
      <div
        className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5"
        style={{ background: 'var(--color-rose-blush)', border: '1px solid var(--color-rose-muted)' }}
      >
        <span className="text-sm font-medium" style={{ color: 'var(--color-rose-deep)' }}>{valor.nome}</span>
        <button
          type="button"
          onClick={() => onSelecionar(null)}
          className="text-xs font-medium transition-opacity hover:opacity-70"
          style={{ color: 'var(--color-rose-deep)' }}
        >
          Trocar
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <input
        type="search"
        value={termo}
        onChange={e => setTermo(e.target.value)}
        placeholder="Buscar por nome, telefone ou CPF"
        aria-label="Buscar responsável"
        className="input-base"
        autoComplete="off"
      />

      {!termoAtivo && (
        <p className="text-xs" style={{ color: 'var(--color-ink-faint)' }}>
          Digite ao menos {TAMANHO_MINIMO_BUSCA} caracteres. Se a mãe ou o pai já tem outro filho aqui, ele aparece na busca.
        </p>
      )}

      {termoAtivo && buscando && (
        <p className="text-xs" style={{ color: 'var(--color-ink-faint)' }}>Buscando...</p>
      )}

      {termoAtivo && erro && (
        <p className="text-xs" style={{ color: '#B91C1C' }}>{erro}</p>
      )}

      {termoAtivo && !buscando && !erro && resultados.length === 0 && (
        <p className="text-xs" style={{ color: 'var(--color-ink-faint)' }}>Nenhum responsável encontrado.</p>
      )}

      {termoAtivo && resultados.length > 0 && (
        <ul
          className="rounded-xl overflow-hidden max-h-60 overflow-y-auto"
          style={{ border: '1px solid var(--color-border)' }}
        >
          {resultados.map(r => {
            const jaVinculado = excluirIds.includes(r.id)
            return (
              <li key={r.id} style={{ borderBottom: '1px solid var(--color-border-soft)' }}>
                <button
                  type="button"
                  disabled={jaVinculado}
                  onClick={() => onSelecionar({ id: r.id, nome: r.nome })}
                  className="w-full text-left px-3 py-2.5 transition-colors hover:bg-[var(--color-border-soft)] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="block text-sm font-medium" style={{ color: 'var(--color-ink)' }}>{r.nome}</span>
                  <span className="block text-xs mt-0.5" style={{ color: 'var(--color-ink-soft)' }}>
                    {[r.telefone, r.cpf_mascarado].filter(Boolean).join(' · ') || 'sem telefone ou CPF'}
                    {' · '}
                    {jaVinculado ? 'já vinculado a este paciente' : textoFilhos(r.total_pacientes)}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {onPedirCadastro && (
        <button
          type="button"
          onClick={onPedirCadastro}
          className="text-xs font-medium transition-opacity hover:opacity-70"
          style={{ color: 'var(--color-rose-main)' }}
        >
          + Não achei, cadastrar novo responsável
        </button>
      )}
    </div>
  )
}
