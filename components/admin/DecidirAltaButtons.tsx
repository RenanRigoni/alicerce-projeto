'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  solicitacaoId: string
  pacienteNome: string
}

export function DecidirAltaButtons({ solicitacaoId, pacienteNome }: Props) {
  const router = useRouter()
  const [modalRecusa, setModalRecusa] = useState(false)
  const [argumentacao, setArgumentacao] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')

  async function decidir(decisao: 'aprovada' | 'recusada') {
    setErro('')
    setCarregando(true)

    const res = await fetch(`/api/alta/${solicitacaoId}/decidir`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decisao, argumentacao_recusa: argumentacao }),
    })

    const json = await res.json()
    setCarregando(false)

    if (!res.ok) { setErro(json.error ?? 'Erro ao processar decisão.'); return }

    setModalRecusa(false)
    router.refresh()
  }

  return (
    <>
      <div className="flex gap-2 flex-shrink-0">
        <button
          onClick={() => decidir('aprovada')}
          disabled={carregando}
          className="text-xs font-medium px-3 py-1.5 rounded-lg text-white transition-all duration-200 disabled:opacity-50"
          style={{ background: 'var(--color-sage-main)' }}
        >
          Aprovar
        </button>
        <button
          onClick={() => setModalRecusa(true)}
          disabled={carregando}
          className="text-xs font-medium px-3 py-1.5 rounded-lg transition-all duration-200 disabled:opacity-50"
          style={{ background: '#FEF2F2', color: '#B91C1C', border: '1px solid #FECACA' }}
        >
          Recusar
        </button>
      </div>

      {modalRecusa && (
        <div className="fixed inset-0 flex items-center justify-center z-50 px-4" style={{ background: 'rgba(44,32,24,0.4)' }}>
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
              Recusar alta — {pacienteNome}
            </h2>
            <p className="text-sm" style={{ color: 'var(--color-ink-soft)' }}>
              Informe o motivo da recusa. A terapeuta receberá esta argumentação.
            </p>
            <textarea
              value={argumentacao}
              onChange={e => setArgumentacao(e.target.value)}
              rows={4}
              placeholder="Argumentação para a recusa..."
              className="input-base resize-none"
            />
            {erro && (
              <p className="text-sm" style={{ color: '#B91C1C' }}>{erro}</p>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => decidir('recusada')}
                disabled={carregando}
                className="flex-1 text-sm font-medium px-4 py-2 rounded-xl text-white transition-colors disabled:opacity-50"
                style={{ background: '#DC2626' }}
              >
                {carregando ? 'Enviando...' : 'Confirmar recusa'}
              </button>
              <button
                onClick={() => { setModalRecusa(false); setErro('') }}
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
