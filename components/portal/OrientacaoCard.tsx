'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/Card'

const tipoLabel: Record<string, string> = {
  texto: 'Orientação', video: 'Vídeo', pdf: 'PDF', imagem: 'Imagem', guia: 'Guia',
}

interface Orientacao {
  id: string
  titulo: string
  tipo: string
  url_midia: string | null
  conteudo: string
  criado_em: string
}

export function OrientacaoCard({ o }: { o: Orientacao }) {
  const [expandida, setExpandida] = useState(false)

  return (
    <Card>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="font-medium" style={{ color: 'var(--color-ink)' }}>{o.titulo}</div>
          {!expandida && (
            <p className="text-sm mt-0.5 line-clamp-2" style={{ color: 'var(--color-ink-soft)' }}>
              {o.conteudo || tipoLabel[o.tipo] || o.tipo}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {o.tipo && o.tipo !== 'texto' && (
            <span
              className="text-xs px-2 py-0.5 rounded-full"
              style={{ background: 'var(--color-peach-light)', color: 'var(--color-peach-main)' }}
            >
              {tipoLabel[o.tipo] ?? o.tipo}
            </span>
          )}
          <button
            onClick={() => setExpandida(v => !v)}
            className="text-sm font-medium transition-opacity hover:opacity-70"
            style={{ color: 'var(--color-peach-main)' }}
          >
            {expandida ? 'Fechar' : 'Ver'}
          </button>
        </div>
      </div>

      {expandida && (
        <div className="mt-3 pt-3 border-t space-y-2" style={{ borderColor: 'var(--color-border-soft)' }}>
          {(!o.tipo || o.tipo === 'texto' || o.tipo === 'guia') ? (
            <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--color-ink-mid)' }}>{o.conteudo}</p>
          ) : o.tipo === 'video' && o.url_midia ? (
            <>
              {o.url_midia.includes('youtu') ? (
                <div className="aspect-video rounded-xl overflow-hidden" style={{ background: 'var(--color-border-soft)' }}>
                  <iframe
                    src={o.url_midia.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/')}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              ) : (
                <a href={o.url_midia} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-medium transition-opacity hover:opacity-70"
                  style={{ color: 'var(--color-peach-main)' }}>
                  ▶ Assistir vídeo
                </a>
              )}
              {o.conteudo && <p className="text-sm" style={{ color: 'var(--color-ink-soft)' }}>{o.conteudo}</p>}
            </>
          ) : o.tipo === 'pdf' && o.url_midia ? (
            <>
              <a href={o.url_midia} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-medium transition-opacity hover:opacity-70"
                style={{ color: 'var(--color-peach-main)' }}>
                📄 Abrir PDF
              </a>
              {o.conteudo && <p className="text-sm" style={{ color: 'var(--color-ink-soft)' }}>{o.conteudo}</p>}
            </>
          ) : o.tipo === 'imagem' && o.url_midia ? (
            <>
              <img src={o.url_midia} alt={o.titulo} className="rounded-xl max-w-full max-h-64 object-contain" />
              {o.conteudo && <p className="text-sm" style={{ color: 'var(--color-ink-soft)' }}>{o.conteudo}</p>}
            </>
          ) : (
            o.conteudo && <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--color-ink-mid)' }}>{o.conteudo}</p>
          )}
        </div>
      )}

      <div className="text-xs mt-2" style={{ color: 'var(--color-ink-faint)' }}>
        {new Date(o.criado_em).toLocaleDateString('pt-BR')}
      </div>
    </Card>
  )
}
