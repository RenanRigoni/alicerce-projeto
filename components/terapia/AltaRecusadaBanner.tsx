'use client'

import { useState } from 'react'

interface Props {
  altaId: string
  argumentacao_recusa: string | null
}

export function AltaRecusadaBanner({ altaId, argumentacao_recusa }: Props) {
  const [fechado, setFechado] = useState(false)
  if (fechado) return null

  return (
    <div
      className="rounded-xl px-4 py-3 text-sm flex items-start gap-3"
      style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C' }}
    >
      <div className="flex-1">
        <strong>Alta recusada pela administração.</strong>{' '}
        {argumentacao_recusa && <span>Motivo: {argumentacao_recusa.slice(0, 120)}{argumentacao_recusa.length > 120 ? '…' : ''}</span>}
        {' '}
        <a
          href={`/terapia/alta/${altaId}`}
          className="underline font-medium"
          style={{ color: '#991B1B' }}
        >
          Ver detalhes completos →
        </a>
      </div>
      <button
        onClick={() => setFechado(true)}
        className="flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity"
        aria-label="Fechar"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}
