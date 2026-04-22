'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  pacienteId: string
  pacienteNome: string
}

export function SolicitarAltaButton({ pacienteId, pacienteNome }: Props) {
  const router = useRouter()
  const [modalAberto, setModalAberto] = useState(false)
  const [motivo, setMotivo] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')

  async function handleSolicitar() {
    if (!motivo.trim()) { setErro('O motivo é obrigatório.'); return }
    setErro('')
    setEnviando(true)

    const res = await fetch('/api/alta/solicitar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paciente_id: pacienteId, motivo }),
    })

    const json = await res.json()
    setEnviando(false)

    if (!res.ok) { setErro(json.error ?? 'Erro ao solicitar alta.'); return }

    setModalAberto(false)
    router.refresh()
  }

  return (
    <>
      <button
        onClick={() => setModalAberto(true)}
        className="text-sm font-medium px-4 py-2 rounded-xl transition-all duration-200"
        style={{
          border: '1px solid #FDE68A',
          color: '#92400E',
          background: '#FFFBEB',
        }}
      >
        Solicitar alta
      </button>

      {modalAberto && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 px-4"
          style={{ background: 'rgba(44,32,24,0.4)' }}
        >
          <div
            className="rounded-2xl p-6 w-full max-w-sm space-y-4"
            style={{
              background: 'var(--color-warm-white)',
              boxShadow: '0 20px 60px rgba(44,32,24,0.2)',
            }}
          >
            <h2
              className="text-base font-semibold"
              style={{ fontFamily: 'var(--font-lora)', color: 'var(--color-ink)' }}
            >
              Solicitar alta — {pacienteNome}
            </h2>
            <p className="text-sm" style={{ color: 'var(--color-ink-soft)' }}>
              A solicitação será enviada para a administração para aprovação.
            </p>
            <div>
              <label
                className="block text-sm font-medium mb-1.5"
                style={{ color: 'var(--color-ink-mid)' }}
              >
                Motivo da alta <span style={{ color: 'var(--color-rose-main)' }}>*</span>
              </label>
              <textarea
                value={motivo}
                onChange={e => setMotivo(e.target.value)}
                rows={4}
                placeholder="Descreva o motivo da alta terapêutica..."
                className="input-base resize-none"
              />
            </div>
            {erro && (
              <p className="text-sm" style={{ color: '#B91C1C' }}>{erro}</p>
            )}
            <div className="flex gap-3">
              <button
                onClick={handleSolicitar}
                disabled={enviando}
                className="flex-1 text-sm font-medium px-4 py-2 rounded-xl text-white transition-colors disabled:opacity-50"
                style={{ background: '#D97706' }}
              >
                {enviando ? 'Enviando...' : 'Enviar solicitação'}
              </button>
              <button
                onClick={() => { setModalAberto(false); setErro(''); setMotivo('') }}
                className="text-sm px-4 py-2 transition-colors"
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
