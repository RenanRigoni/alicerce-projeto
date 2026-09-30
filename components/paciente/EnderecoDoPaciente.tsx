'use client'

import { useState } from 'react'
import { formatarEndereco } from '@/lib/endereco/formatar'
import type { Responsavel } from '@/lib/paciente/responsaveis-vinculo'

interface Props {
  responsaveis: Responsavel[]
  isAdminOuRecepcao: boolean
  podeGerenciarResponsaveis: boolean
  onIrParaResponsaveis: () => void
}

const TEMPO_AVISO_COPIADO_MS = 2500

/** O principal; sem principal, o primeiro. */
function escolherResponsavel(responsaveis: Responsavel[]): Responsavel | null {
  return responsaveis.find(r => r.tipo === 'principal') ?? responsaveis[0] ?? null
}

/**
 * O paciente não tem endereço próprio: herda o do responsável. Só leitura,
 * com botão de copiar para a recepção colar em formulários e guias.
 */
export function EnderecoDoPaciente({
  responsaveis, isAdminOuRecepcao, podeGerenciarResponsaveis, onIrParaResponsaveis,
}: Props) {
  const [estadoCopia, setEstadoCopia] = useState<'ocioso' | 'copiado' | 'falhou'>('ocioso')
  const responsavel = escolherResponsavel(responsaveis)
  const endereco = responsavel ? formatarEndereco(responsavel) : null

  async function copiar() {
    if (!endereco) return
    try {
      await navigator.clipboard.writeText(endereco)
      setEstadoCopia('copiado')
    } catch {
      setEstadoCopia('falhou')
    }
    setTimeout(() => setEstadoCopia('ocioso'), TEMPO_AVISO_COPIADO_MS)
  }

  const hrefCadastro = responsavel
    ? (isAdminOuRecepcao ? `/admin/usuarios/${responsavel.id}` : `/terapia/responsavel/${responsavel.id}/editar`)
    : null

  return (
    <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--color-border-soft)' }}>
      <div className="text-xs uppercase tracking-wide mb-1.5" style={{ color: 'var(--color-ink-faint)' }}>
        {responsavel && responsavel.tipo !== 'principal'
          ? `Endereço (de ${responsavel.nome})`
          : 'Endereço (do responsável principal)'}
      </div>

      {!responsavel && (
        <p className="text-sm" style={{ color: 'var(--color-ink-faint)' }}>
          Sem responsável vinculado, então não há endereço para mostrar.
          {podeGerenciarResponsaveis && (
            <>
              {' '}
              <button
                type="button"
                onClick={onIrParaResponsaveis}
                className="font-medium transition-opacity hover:opacity-70"
                style={{ color: 'var(--color-rose-main)' }}
              >
                Vincular responsável →
              </button>
            </>
          )}
        </p>
      )}

      {responsavel && !endereco && (
        <p className="text-sm" style={{ color: 'var(--color-ink-faint)' }}>
          O cadastro de {responsavel.nome} ainda não tem endereço.{' '}
          {hrefCadastro && (
            <a href={hrefCadastro} className="font-medium transition-opacity hover:opacity-70" style={{ color: 'var(--color-rose-main)' }}>
              Completar cadastro →
            </a>
          )}
        </p>
      )}

      {responsavel && endereco && (
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm" style={{ color: 'var(--color-ink)' }}>{endereco}</p>
          <button
            type="button"
            onClick={copiar}
            className="flex-shrink-0 text-xs font-medium px-3 py-1.5 rounded-lg border transition-all"
            style={estadoCopia === 'copiado'
              ? { background: 'var(--color-sage-light)', color: 'var(--color-sage-deep)', borderColor: 'var(--color-sage-soft)' }
              : { background: 'transparent', color: 'var(--color-ink-mid)', borderColor: 'var(--color-border)' }}
          >
            {estadoCopia === 'copiado' ? 'Copiado!' : estadoCopia === 'falhou' ? 'Não foi possível copiar' : 'Copiar'}
          </button>
        </div>
      )}
    </div>
  )
}
