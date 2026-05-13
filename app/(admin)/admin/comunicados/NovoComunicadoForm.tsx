'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

export function NovoComunicadoForm() {
  const router = useRouter()
  const [aberto, setAberto] = useState(false)
  const [titulo, setTitulo] = useState('')
  const [conteudo, setConteudo] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  async function handlePublicar() {
    if (!titulo.trim() || !conteudo.trim()) {
      setErro('Preencha o título e o conteúdo.')
      return
    }
    setErro('')
    setSalvando(true)

    const res = await fetch('/api/comunicado', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        titulo: titulo.trim(),
        conteudo: conteudo.trim(),
      }),
    })
    const json = await res.json().catch(() => ({}))

    setSalvando(false)
    if (!res.ok) { setErro(json.error ?? 'Erro ao publicar. Tente novamente.'); return }

    setTitulo('')
    setConteudo('')
    setAberto(false)
    router.refresh()
  }

  if (!aberto) {
    return (
      <button
        onClick={() => setAberto(true)}
        className="text-sm font-medium px-4 py-2 rounded-xl text-white transition-all duration-200 active:scale-[0.98]"
        style={{ background: 'var(--color-rose-main)' }}
      >
        + Novo comunicado
      </button>
    )
  }

  return (
    <Card>
      <div className="space-y-3">
        <h2 className="text-sm font-semibold" style={{ color: 'var(--color-ink-mid)' }}>
          Novo comunicado
        </h2>
        <input
          value={titulo}
          onChange={e => setTitulo(e.target.value)}
          placeholder="Título"
          className="input-base"
        />
        <textarea
          value={conteudo}
          onChange={e => setConteudo(e.target.value)}
          placeholder="Mensagem para as famílias..."
          rows={4}
          className="input-base resize-none"
        />
        {erro && <p className="text-sm" style={{ color: '#B91C1C' }}>{erro}</p>}
        <div className="flex gap-3">
          <Button onClick={handlePublicar} disabled={salvando}>
            {salvando ? 'Publicando...' : 'Publicar'}
          </Button>
          <Button variant="ghost" onClick={() => { setAberto(false); setErro('') }}>
            Cancelar
          </Button>
        </div>
      </div>
    </Card>
  )
}
