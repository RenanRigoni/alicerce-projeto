'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card } from '@/components/ui/Card'

interface Comentario {
  id: string
  conteudo: string
  criado_em: string
  autor: { id: string; nome: string; role: string } | null
}

interface Props {
  refTipo: 'relatorio' | 'documento'
  refId: string
}

export function ComentariosSection({ refTipo, refId }: Props) {
  const [comentarios, setComentarios] = useState<Comentario[]>([])
  const [carregando, setCarregando] = useState(true)
  const [novoTexto, setNovoTexto] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  const buscarComentarios = useCallback(async () => {
    const res = await fetch(`/api/comentario?ref_tipo=${refTipo}&ref_id=${refId}`)
    if (res.ok) {
      const data = await res.json()
      return Array.isArray(data) ? data : []
    }
    return []
  }, [refTipo, refId])

  async function carregar() {
    setCarregando(true)
    setComentarios(await buscarComentarios())
    setCarregando(false)
  }

  useEffect(() => {
    let ativo = true

    buscarComentarios().then(data => {
      if (!ativo) return
      setComentarios(data)
      setCarregando(false)
    })

    return () => {
      ativo = false
    }
  }, [buscarComentarios])

  async function handleEnviar() {
    const texto = novoTexto.trim()
    if (!texto) return
    setErro('')
    setSalvando(true)
    const res = await fetch('/api/comentario', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ref_tipo: refTipo, ref_id: refId, conteudo: texto }),
    })
    if (res.ok) {
      setNovoTexto('')
      await carregar()
    } else {
      const data = await res.json().catch(() => ({}))
      setErro(data.error ?? 'Erro ao enviar comentário.')
    }
    setSalvando(false)
  }

  return (
    <Card>
      <h3
        className="text-sm font-semibold uppercase tracking-wide mb-4"
        style={{ color: 'var(--color-ink-faint)' }}
      >
        Comentários
      </h3>

      {carregando ? (
        <p className="text-sm" style={{ color: 'var(--color-ink-soft)' }}>Carregando...</p>
      ) : comentarios.length === 0 ? (
        <p className="text-sm" style={{ color: 'var(--color-ink-soft)' }}>Nenhum comentário ainda.</p>
      ) : (
        <ul className="space-y-3 mb-4">
          {comentarios.map(c => (
            <li key={c.id} className="text-sm border-b pb-3 last:border-0 last:pb-0" style={{ borderColor: 'var(--color-border)' }}>
              <div className="flex items-baseline justify-between mb-1 gap-2">
                <span className="font-medium" style={{ color: 'var(--color-ink)' }}>
                  {c.autor?.nome ?? 'Usuário'}
                </span>
                <span className="text-xs shrink-0" style={{ color: 'var(--color-ink-faint)' }}>
                  {new Date(c.criado_em).toLocaleString('pt-BR', {
                    day: '2-digit', month: '2-digit', year: 'numeric',
                    hour: '2-digit', minute: '2-digit',
                  })}
                </span>
              </div>
              <p style={{ color: 'var(--color-ink-mid)' }}>{c.conteudo}</p>
            </li>
          ))}
        </ul>
      )}

      <div className="space-y-2 pt-2">
        <textarea
          value={novoTexto}
          onChange={e => setNovoTexto(e.target.value)}
          placeholder="Adicionar comentário..."
          rows={3}
          className="input-base w-full resize-none"
          disabled={salvando}
        />
        {erro && <p className="text-xs" style={{ color: '#B91C1C' }}>{erro}</p>}
        <button
          onClick={handleEnviar}
          disabled={salvando || !novoTexto.trim()}
          className="text-sm font-medium px-4 py-1.5 rounded transition-opacity disabled:opacity-40"
          style={{ background: 'var(--color-rose-main)', color: '#fff' }}
        >
          {salvando ? 'Enviando...' : 'Comentar'}
        </button>
      </div>
    </Card>
  )
}
