'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

interface Comunicado {
  id: string
  titulo: string
  conteudo: string
  criado_em: string
  profiles?: { nome: string } | null
}

interface Props {
  comunicados: Comunicado[]
}

export function ComunicadosList({ comunicados }: Props) {
  const router = useRouter()
  const [editando, setEditando] = useState<string | null>(null)
  const [form, setForm] = useState({ titulo: '', conteudo: '' })
  const [salvando, setSalvando] = useState(false)
  const [deletando, setDeletando] = useState<string | null>(null)
  const [confirmarDelete, setConfirmarDelete] = useState<string | null>(null)
  const [erro, setErro] = useState('')

  function iniciarEdicao(c: Comunicado) {
    setEditando(c.id)
    setForm({ titulo: c.titulo, conteudo: c.conteudo })
    setErro('')
  }

  function cancelarEdicao() {
    setEditando(null)
    setErro('')
  }

  async function salvarEdicao(id: string) {
    if (!form.titulo.trim() || !form.conteudo.trim()) {
      setErro('Preencha título e conteúdo.')
      return
    }
    setSalvando(true)
    setErro('')
    const res = await fetch(`/api/comunicado/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setSalvando(false)
    if (!res.ok) { setErro('Erro ao salvar.'); return }
    setEditando(null)
    router.refresh()
  }

  async function excluir(id: string) {
    setDeletando(id)
    const res = await fetch(`/api/comunicado/${id}`, { method: 'DELETE' })
    setDeletando(null)
    setConfirmarDelete(null)
    if (!res.ok) { setErro('Erro ao excluir.'); return }
    router.refresh()
  }

  return (
    <div className="space-y-3">
      {comunicados.length === 0 ? (
        <Card>
          <p className="text-sm" style={{ color: 'var(--color-ink-faint)' }}>
            Nenhum comunicado publicado ainda.
          </p>
        </Card>
      ) : comunicados.map(c => (
        <Card key={c.id}>
          {editando === c.id ? (
            <div className="space-y-3">
              <input
                value={form.titulo}
                onChange={e => setForm(p => ({ ...p, titulo: e.target.value }))}
                className="input-base font-medium"
                placeholder="Título"
              />
              <textarea
                value={form.conteudo}
                onChange={e => setForm(p => ({ ...p, conteudo: e.target.value }))}
                rows={4}
                className="input-base resize-y"
                placeholder="Conteúdo"
              />
              {erro && <p className="text-sm" style={{ color: '#B91C1C' }}>{erro}</p>}
              <div className="flex gap-2">
                <Button onClick={() => salvarEdicao(c.id)} disabled={salvando}>
                  {salvando ? 'Salvando...' : 'Salvar'}
                </Button>
                <Button variant="ghost" onClick={cancelarEdicao}>Cancelar</Button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-start justify-between gap-3 mb-1">
                <div className="font-medium" style={{ color: 'var(--color-ink)' }}>{c.titulo}</div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => iniciarEdicao(c)}
                    className="text-xs font-medium px-2.5 py-1 rounded-lg transition-colors"
                    style={{ background: 'var(--color-rose-blush)', color: 'var(--color-rose-deep)' }}
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => setConfirmarDelete(c.id)}
                    className="text-xs font-medium px-2.5 py-1 rounded-lg transition-colors"
                    style={{ background: '#FEF2F2', color: '#B91C1C' }}
                  >
                    Excluir
                  </button>
                </div>
              </div>
              <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--color-ink-mid)' }}>{c.conteudo}</p>
              <div className="text-xs mt-2" style={{ color: 'var(--color-ink-faint)' }}>
                {c.profiles?.nome ?? '—'} · {new Date(c.criado_em).toLocaleDateString('pt-BR', {
                  day: '2-digit', month: 'long', year: 'numeric',
                })}
              </div>
            </>
          )}
        </Card>
      ))}

      {confirmarDelete && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 flex items-start justify-center z-50 p-4 pt-20"
          style={{ background: 'rgba(44,32,24,0.4)' }}
          onClick={() => setConfirmarDelete(null)}
        >
          <div
            className="rounded-2xl p-5 max-w-sm w-full space-y-4"
            style={{ background: 'var(--color-warm-white)', boxShadow: '0 20px 60px rgba(44,32,24,0.2)' }}
            onClick={e => e.stopPropagation()}
          >
            <h3 className="font-semibold" style={{ color: 'var(--color-ink)' }}>Excluir comunicado?</h3>
            <p className="text-sm" style={{ color: 'var(--color-ink-soft)' }}>
              Esta ação não pode ser desfeita. O comunicado será removido para todos os usuários.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => excluir(confirmarDelete)}
                disabled={deletando === confirmarDelete}
                className="flex-1 text-sm font-medium px-4 py-2 rounded-xl text-white transition-all disabled:opacity-50"
                style={{ background: '#DC2626' }}
              >
                {deletando === confirmarDelete ? 'Excluindo...' : 'Excluir'}
              </button>
              <button
                onClick={() => setConfirmarDelete(null)}
                className="text-sm px-4 py-2 rounded-xl transition-opacity hover:opacity-70"
                style={{ color: 'var(--color-ink-soft)' }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
