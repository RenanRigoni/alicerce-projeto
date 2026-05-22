'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

interface Notificacao {
  id: string
  tipo: string
  titulo: string
  mensagem: string | null
  lida: boolean
  link: string | null
  criado_em: string
}

interface PainelPosicao {
  left: number
  top: number
  width: number
  maxListHeight: number
}

const PANEL_MAX_WIDTH = 320
const PANEL_MAX_HEIGHT = 480
const PANEL_GAP = 12
const VIEWPORT_MARGIN = 16
const PANEL_HEADER_HEIGHT = 50

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

export function NotificacoesBell({ expanded = false }: { expanded?: boolean }) {
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([])
  const [aberto, setAberto] = useState(false)
  const [carregando, setCarregando] = useState(true)
  const [pos, setPos] = useState<PainelPosicao | null>(null)
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

  const calcularPosicao = useCallback((): PainelPosicao | null => {
    const rect = buttonRef.current?.getBoundingClientRect()
    if (!rect) return null

    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight
    const width = Math.min(PANEL_MAX_WIDTH, Math.max(0, viewportWidth - VIEWPORT_MARGIN * 2))
    const maxLeft = Math.max(VIEWPORT_MARGIN, viewportWidth - width - VIEWPORT_MARGIN)

    let left: number
    if (viewportWidth - rect.right - PANEL_GAP >= width) {
      left = rect.right + PANEL_GAP
    } else {
      left = rect.left + rect.width / 2 - width / 2
    }

    const availableBelow = Math.max(0, viewportHeight - rect.bottom - PANEL_GAP - VIEWPORT_MARGIN)
    const availableAbove = Math.max(0, rect.top - PANEL_GAP - VIEWPORT_MARGIN)
    const openBelow = availableBelow >= Math.min(260, PANEL_MAX_HEIGHT) || availableBelow >= availableAbove
    const availableHeight = openBelow ? availableBelow : availableAbove
    const maxPanelHeight = Math.max(120, Math.min(PANEL_MAX_HEIGHT, availableHeight))
    const rawTop = openBelow ? rect.bottom + PANEL_GAP : rect.top - PANEL_GAP - maxPanelHeight
    const maxTop = Math.max(VIEWPORT_MARGIN, viewportHeight - maxPanelHeight - VIEWPORT_MARGIN)

    return {
      left: clamp(left, VIEWPORT_MARGIN, maxLeft),
      top: clamp(rawTop, VIEWPORT_MARGIN, maxTop),
      width,
      maxListHeight: Math.max(120, maxPanelHeight - PANEL_HEADER_HEIGHT),
    }
  }, [])

  useEffect(() => {
    if (!aberto) return

    function updatePosition() {
      const nextPos = calcularPosicao()
      if (nextPos) setPos(nextPos)
    }

    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)

    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [aberto, calcularPosicao])

  function toggle() {
    if (aberto) {
      setAberto(false)
      setPos(null)
      return
    }

    const nextPos = calcularPosicao()
    if (!nextPos) return
    setPos(nextPos)
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
      {expanded ? (
        <button
          ref={buttonRef}
          onClick={toggle}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors"
          style={{ color: 'var(--color-ink-mid)' }}
          aria-label="Notificações"
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--color-border-soft)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
        >
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} className="shrink-0">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <span className="flex-1 text-sm text-left whitespace-nowrap">Notificações</span>
          {naoLidas > 0 && (
            <span
              className="text-[13px] font-bold px-2 py-0.5 rounded-full text-white shrink-0"
              style={{ background: 'var(--color-rose-main)' }}
            >
              {naoLidas > 9 ? '9+' : naoLidas}
            </span>
          )}
        </button>
      ) : (
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
              className="absolute -top-0.5 -right-0.5 text-[12px] font-bold w-5 h-5 rounded-full flex items-center justify-center text-white"
              style={{ background: 'var(--color-rose-main)' }}
            >
              {naoLidas > 9 ? '9+' : naoLidas}
            </span>
          )}
        </button>
      )}

      {aberto && pos && (
        <div
          ref={containerRef}
          role="dialog"
          aria-modal="true"
          aria-label="Notificações"
          className="rounded-2xl shadow-xl overflow-hidden"
          style={{
            position: 'fixed',
            left: pos.left,
            top: pos.top,
            width: pos.width,
            maxHeight: pos.maxListHeight + PANEL_HEADER_HEIGHT,
            zIndex: 9999,
            background: 'var(--color-warm-white)',
            border: '1px solid var(--color-border-soft)',
            boxShadow: '0 8px 40px rgba(44,32,24,0.15)',
          }}
        >
          <div className="flex items-center justify-between gap-3 px-4 py-3" style={{ borderBottom: '1px solid var(--color-border-soft)' }}>
            <span className="text-sm font-semibold" style={{ color: 'var(--color-ink)' }}>Notificações</span>
            {naoLidas > 0 && (
              <button onClick={marcarTodasLidas} className="text-xs transition-opacity hover:opacity-70" style={{ color: 'var(--color-rose-main)' }}>
                Marcar todas como lidas
              </button>
            )}
          </div>

          <ul
            role="list"
            aria-live="polite"
            aria-label="Lista de notificações"
            className="overflow-y-auto divide-y"
            style={{ maxHeight: pos.maxListHeight, borderColor: 'var(--color-border-soft)', listStyle: 'none', margin: 0, padding: 0 }}
          >
            {carregando ? (
              <li className="px-4 py-6 text-center text-sm" style={{ color: 'var(--color-ink-faint)' }}>Carregando...</li>
            ) : notificacoes.length === 0 ? (
              <li className="px-4 py-6 text-center text-sm" style={{ color: 'var(--color-ink-faint)' }}>Nenhuma notificação.</li>
            ) : notificacoes.map(n => (
              <li
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
              </li>
            ))}
          </ul>
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
