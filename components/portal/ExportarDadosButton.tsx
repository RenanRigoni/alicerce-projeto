'use client'

import { useState } from 'react'

export function ExportarDadosButton() {
  const [carregando, setCarregando] = useState(false)

  async function handleExportar() {
    setCarregando(true)
    try {
      const res = await fetch('/api/portal/exportar-dados')
      if (!res.ok) throw new Error('Erro ao gerar exportação')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `meus-dados-alicerce-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setCarregando(false)
    }
  }

  return (
    <button
      onClick={handleExportar}
      disabled={carregando}
      className="inline-flex items-center gap-2 text-sm font-medium px-4 py-2.5 rounded-xl transition-all duration-200 disabled:opacity-60"
      style={{ background: 'var(--color-rose-blush)', color: 'var(--color-rose-deep)' }}
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
      {carregando ? 'Gerando...' : 'Baixar meus dados (JSON)'}
    </button>
  )
}
