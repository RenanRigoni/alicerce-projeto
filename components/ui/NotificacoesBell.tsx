'use client'

import { useState, useEffect, useRef } from 'react'

interface Notificacao {
  id: string
  tipo: string
  titulo: string
  mensagem: string | null
  lida: boolean
  link: string | null
  criado_em: string
}

export function NotificacoesBell() {
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([])
  const [aberto, setAberto] = useState(false)
  const [carregando, setCarregando] = useState(true)
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  const naoLidas = notificacoes.filter(n => !n.lida).length

  async function carregar() {
    const { createClient } = await import('@/lib/supabase/client')
    const supabase = createClient()
    const { data } = await supabase
      .from('notificacoes')
      .select('id, tipo, titulo, mensagem, lida, link, criado_em')
      .order('criado_em', { ascending: false })
      .limit(30)
    setNotificacoes(data ?? [])
    setCarregando(false)
  }

  useEffect(() => {
    carregar()
    const onFocus = () => carregar()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = e.target as Node
      if (
        containerRef.current?.contains(target) === false &&
        !buttonRef.current?.contains(target)
      ) {
        setAberto(false)
        setPos(null)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function toggle() {
    if (aberto) {
      setAberto(false)
      setPos(null)
      return
    }
    const rect = buttonRef.current?.getBoundingClientRect()
    if (rect) {
      // Painel de 320px de largura; abre à direita do botão
      // Ancora o bottom do painel no bottom do botão para crescer para cima
      const panelH = Math.min(480, window.innerHeight - 80)
      const top = Math.max(16, rect.bottom - panelH)
      setPos({ left: rect.right + 12, top })
    }
    setAberto(true)
  }

  async function marcarTodasLidas() {
    const naoLidasIds = notificacoes.filter(n => !n.lida).map(n => n.id)
    if (naoLidasIds.length === 0) return
    const { createClient } = await import('@/lib/supabase/client')
    await createClient().from('notificacoes').update({ lida: true }).in('id', naoLidasIds)
    setNotificacoes(prev => prev.map(n => ({ ...n, lida: true })))
  }

  async function marcarLida(id: string) {
    const { createClient } = await import('@/lib/supabase/client')
    await createClient().from('notificacoes').update({ lida: true }).eq('id', id)
    setNotificacoes(prev => prev.map(n => n.id === id ? { ...n, lida: true } : n))
  }

  return (
    <>
      <button
        ref={buttonRef}
        onClick={toggle}
        className="relative p-1.5 rounded-lg transition-colors hover:opacity-70"
        style={{ color: 'var(--color-ink-soft)' }}
        aria-label="Notificações"
      >
        <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {naoLidas > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center text-white"
            style={{ background: 'var(--color-rose-main)' }}
          >
            {naoLidas > 9 ? '9+' : naoLidas}
          </span>
        )}
      </button>

      {aberto && pos && (
        <div
          ref={containerRef}
          className="rounded-2xl shadow-xl overflow-hidden"
          style={{
            position: 'fixed',
            left: pos.left,
            top: pos.top,
            width: 320,
            zIndex: 9999,
            background: 'var(--color-warm-white)',
            border: '1px solid var(--color-border-soft)',
            boxShadow: '0 8px 40px rgba(44,32,24,0.15)',
          }}
        >
          <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--color-border-soft)' }}>
            <span className="text-sm font-semibold" style={{ color: 'var(--color-ink)' }}>Notificações</span>
            {naoLidas > 0 && (
              <button onClick={marcarTodasLidas} className="text-xs transition-opacity hover:opacity-70" style={{ color: 'var(--color-rose-main)' }}>
                Marcar todas como lidas
              </button>
            )}
          </div>

          <div className="overflow-y-auto divide-y" style={{ maxHeight: 384, borderColor: 'var(--color-border-soft)' }}>
            {carregando ? (
              <div className="px-4 py-6 text-center text-sm" style={{ color: 'var(--color-ink-faint)' }}>Carregando...</div>
            ) : notificacoes.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm" style={{ color: 'var(--color-ink-faint)' }}>Nenhuma notificação.</div>
            ) : notificacoes.map(n => (
              <div
                key={n.id}
                className="px-4 py-3 transition-colors"
                style={{ background: n.lida ? 'transparent' : 'var(--color-rose-blush)' }}
              >
                {n.link ? (
                  <a href={n.link} onClick={() => { marcarLida(n.id); setAberto(false) }} className="block">
                    <NotificacaoItem n={n} />
                  </a>
                ) : (
                  <button onClick={() => marcarLida(n.id)} className="block w-full text-left">
                    <NotificacaoItem n={n} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}

function NotificacaoItem({ n }: { n: Notificacao }) {
  return (
    <>
      <div className="text-sm font-medium" style={{ color: 'var(--color-ink)' }}>{n.titulo}</div>
      {n.mensagem && (
        <p className="text-xs mt-0.5 line-clamp-2" style={{ color: 'var(--color-ink-soft)' }}>{n.mensagem}</p>
      )}
      <div className="text-xs mt-1" style={{ color: 'var(--color-ink-faint)' }}>
        {new Date(n.criado_em).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
      </div>
    </>
  )
}
