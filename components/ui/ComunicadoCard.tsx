'use client'

import { useState } from 'react'
import { Card } from './Card'

interface Props {
  titulo: string
  conteudo: string
  autor?: string | null
  criado_em: string
}

export function ComunicadoCard({ titulo, conteudo, autor, criado_em }: Props) {
  const [expandido, setExpandido] = useState(false)
  const longo = conteudo.length > 160

  return (
    <Card
      className="cursor-pointer transition-shadow hover:shadow-md"
      onClick={() => longo && setExpandido(v => !v)}
    >
      <div className="font-medium mb-1" style={{ color: 'var(--color-ink)' }}>{titulo}</div>
      <p
        className={`text-sm whitespace-pre-wrap ${!expandido && longo ? 'line-clamp-2' : ''}`}
        style={{ color: 'var(--color-ink-mid)' }}
      >
        {conteudo}
      </p>
      {longo && (
        <button
          onClick={e => { e.stopPropagation(); setExpandido(v => !v) }}
          className="text-xs mt-1 font-medium transition-opacity hover:opacity-70"
          style={{ color: 'var(--color-rose-main)' }}
        >
          {expandido ? 'Mostrar menos' : 'Ler mais'}
        </button>
      )}
      <div className="text-xs mt-2" style={{ color: 'var(--color-ink-faint)' }}>
        {autor && `${autor} · `}
        {new Date(criado_em).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
      </div>
    </Card>
  )
}
