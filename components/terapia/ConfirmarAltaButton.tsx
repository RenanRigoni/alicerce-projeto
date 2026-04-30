'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  altaId: string
  pacienteNome: string
  motivo: string
  documentoUrl?: string | null
}

export function ConfirmarAltaButton({ altaId, pacienteNome, motivo, documentoUrl }: Props) {
  const router = useRouter()
  const [modalAberto, setModalAberto] = useState(false)
  const [confirmando, setConfirmando] = useState(false)
  const [erro, setErro] = useState('')

  async function handleConfirmar() {
    setErro('')
    setConfirmando(true)

    const res = await fetch(`/api/alta/${altaId}/confirmar`, { method: 'PATCH' })
    const json = await res.json()
    setConfirmando(false)

    if (!res.ok) { setErro(json.error ?? 'Erro ao confirmar alta.'); return }

    setModalAberto(false)
    router.refresh()
  }

  return (
    <>
      <div
        className="rounded-xl px-4 py-3 text-sm flex items-start justify-between gap-3"
        style={{ background: '#FFFBEB', border: '1px solid #FDE68A', color: '#92400E' }}
      >
        <div className="flex-1">
          <strong>Solicitação de alta do responsável.</strong>
          {' '}Aguarda sua confirmação para encerrar o tratamento de {pacienteNome}.
          {documentoUrl && (
            <>
              {' '}
              <a
                href={documentoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="underline font-medium"
                style={{ color: '#92400E' }}
              >
                Ver documento médico →
              </a>
            </>
          )}
        </div>
        <button
          onClick={() => setModalAberto(true)}
          className="flex-shrink-0 text-xs font-medium px-3 py-1.5 rounded-lg text-white transition-colors"
          style={{ background: '#D97706' }}
        >
          Ver e confirmar
        </button>
      </div>

      {modalAberto && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 px-4 py-6 overflow-y-auto"
          style={{ background: 'rgba(44,32,24,0.4)' }}
        >
          <div
            className="rounded-2xl p-6 w-full max-w-lg space-y-4 my-auto"
            style={{ background: 'var(--color-warm-white)', boxShadow: '0 20px 60px rgba(44,32,24,0.2)' }}
          >
            <h2 className="text-base font-semibold" style={{ fontFamily: 'var(--font-lora)', color: 'var(--color-ink)' }}>
              Confirmar alta — {pacienteNome}
            </h2>
            <p className="text-sm" style={{ color: 'var(--color-ink-soft)' }}>
              O responsável solicitou a alta do paciente. Ao confirmar, o tratamento será encerrado
              e todos os agendamentos futuros serão cancelados.
            </p>

            <div
              className="rounded-xl px-4 py-3 text-sm"
              style={{ background: 'var(--color-border-soft)', color: 'var(--color-ink-mid)' }}
            >
              <div className="text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--color-ink-faint)' }}>
                Motivo informado pelo responsável
              </div>
              <p className="whitespace-pre-wrap">{motivo}</p>
            </div>

            {documentoUrl && (
              <a
                href={documentoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm font-medium transition-opacity hover:opacity-70"
                style={{ color: 'var(--color-rose-main)' }}
              >
                Abrir documento médico →
              </a>
            )}

            {erro && <p className="text-sm" style={{ color: '#B91C1C' }}>{erro}</p>}

            <div className="flex gap-3 pt-1">
              <button
                onClick={handleConfirmar}
                disabled={confirmando}
                className="flex-1 text-sm font-medium px-4 py-2 rounded-xl text-white transition-colors disabled:opacity-50"
                style={{ background: '#D97706' }}
              >
                {confirmando ? 'Confirmando...' : 'Confirmar alta'}
              </button>
              <button
                onClick={() => { setModalAberto(false); setErro('') }}
                className="text-sm px-4 py-2 transition-colors rounded-xl"
                style={{ color: 'var(--color-ink-soft)' }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
