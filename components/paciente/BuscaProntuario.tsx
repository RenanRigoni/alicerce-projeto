'use client'

import type { AbaDoResultado, ResumoDaBusca } from '@/lib/paciente/busca-prontuario'

interface Props {
  valor: string
  onChange: (valor: string) => void
  /** Preenchido só quando há busca ativa. */
  resumo: ResumoDaBusca | null
  onIrParaAba: (aba: AbaDoResultado) => void
}

/**
 * Campo de busca por texto dentro do prontuário aberto. Só muda o estado da página: o termo não
 * vai ao servidor, à URL nem ao armazenamento do navegador (é texto clínico).
 */
export function BuscaProntuario({ valor, onChange, resumo, onIrParaAba }: Props) {
  return (
    <div className="space-y-1.5 sm:max-w-md sm:ml-auto w-full">
      <div className="relative">
        <input
          type="search"
          value={valor}
          onChange={e => onChange(e.target.value)}
          onKeyDown={e => { if (e.key === 'Escape') onChange('') }}
          placeholder="Buscar no prontuário deste paciente…"
          aria-label="Buscar no prontuário deste paciente"
          autoComplete="off"
          spellCheck={false}
          className="input-base pr-16 [&::-webkit-search-cancel-button]:hidden"
        />
        {valor && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium transition-opacity hover:opacity-70"
            style={{ color: 'var(--color-rose-main)' }}
          >
            Limpar
          </button>
        )}
      </div>

      <div role="status" aria-live="polite" className="text-xs" style={{ color: 'var(--color-ink-soft)' }}>
        {resumo && resumo.total === 0 && (
          <span>
            Nenhum item encontrado em relatórios, evoluções, orientações ou encaminhamentos. O prontuário
            está completo — o que some é só o filtro da busca.
          </span>
        )}
        {resumo && resumo.total > 0 && (
          <span>
            {resumo.total} {resumo.total === 1 ? 'item encontrado' : 'itens encontrados'}:{' '}
            {resumo.porAba.map((a, i) => (
              <span key={a.aba}>
                {i > 0 && ' · '}
                <button
                  type="button"
                  onClick={() => onIrParaAba(a.aba)}
                  className="font-medium underline-offset-2 hover:underline"
                  style={{ color: 'var(--color-rose-main)' }}
                >
                  {a.aba}: {a.rotulo}
                </button>
              </span>
            ))}
          </span>
        )}
      </div>
    </div>
  )
}
