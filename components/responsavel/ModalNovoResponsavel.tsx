'use client'

import { ModalPortal } from '@/components/ui/ModalPortal'
import type { DadosConvite } from '@/components/admin/StatusConvite'
import { FormResponsavelInline } from './FormResponsavelInline'
import type { ResponsavelSelecionado } from './BuscaResponsavel'

interface Props {
  pacienteId?: string
  onCriado: (responsavel: ResponsavelSelecionado, convite: DadosConvite) => void
  onFechar: () => void
}

/**
 * Cadastro de responsável em modal. Usa ModalPortal: o wrapper animate-fade-up
 * dos layouts quebra position:fixed, então o overlay precisa ir para o <body>.
 */
export function ModalNovoResponsavel({ pacienteId, onCriado, onFechar }: Props) {
  return (
    <ModalPortal>
      <div
        className="fixed inset-0 flex items-center justify-center z-[60] p-4"
        style={{ background: 'rgba(44,32,24,0.4)' }}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Cadastrar responsável"
          className="rounded-2xl p-5 max-w-md w-full max-h-[90vh] overflow-y-auto space-y-4"
          style={{ background: 'var(--color-warm-white)', boxShadow: '0 20px 60px rgba(44,32,24,0.2)' }}
        >
          <div className="flex items-center justify-between">
            <h3 className="font-semibold" style={{ color: 'var(--color-ink)' }}>Cadastrar responsável</h3>
            <button
              type="button"
              onClick={onFechar}
              aria-label="Fechar"
              className="text-lg hover:opacity-60"
              style={{ color: 'var(--color-ink-faint)' }}
            >
              ×
            </button>
          </div>
          <FormResponsavelInline
            pacienteId={pacienteId}
            onCriado={onCriado}
            onConcluir={onFechar}
            onCancelar={onFechar}
          />
        </div>
      </div>
    </ModalPortal>
  )
}
