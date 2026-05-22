'use client'

import { useEffect, useState } from 'react'
import { subscribeToPush, isPushSupported } from '@/hooks/usePushNotifications'

type GateState = 'checking' | 'hidden' | 'prompt' | 'blocked' | 'activating'

function isPWA() {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as { standalone?: boolean }).standalone === true
  )
}

async function syncExistingSubscription() {
  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()
    if (subscription) {
      await fetch('/api/push/subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription }),
      })
    }
  } catch {
    // ignore sync failure
  }
}

export function NotificationGate() {
  const [state, setState] = useState<GateState>('checking')
  const [erro, setErro] = useState('')

  useEffect(() => {
    if (!isPWA()) { setState('hidden'); return }
    if (!isPushSupported()) { setState('hidden'); return }
    if (localStorage.getItem('alicerce_notification_prompt_completed') === 'true') { setState('hidden'); return }

    const perm = Notification.permission
    if (perm === 'granted') {
      syncExistingSubscription().finally(() => {
        localStorage.setItem('alicerce_notification_prompt_completed', 'true')
        setState('hidden')
      })
      return
    }
    if (perm === 'denied') { setState('blocked'); return }
    setState('prompt')
  }, [])

  async function handleAtivar() {
    setState('activating')
    setErro('')
    const result = await subscribeToPush()
    if (result.status === 'active') {
      localStorage.setItem('alicerce_notification_prompt_completed', 'true')
      setState('hidden')
    } else if (result.status === 'denied') {
      setState('blocked')
    } else {
      setState('prompt')
      setErro(result.error ?? 'Erro ao ativar notificações.')
    }
  }

  function handleVerificarPermissao() {
    if (typeof Notification === 'undefined') return
    if (Notification.permission === 'granted') {
      syncExistingSubscription().finally(() => {
        localStorage.setItem('alicerce_notification_prompt_completed', 'true')
        setState('hidden')
      })
    }
    // Se ainda negado, permanece na tela de bloqueio
  }

  function handleTentarNovamente() {
    if (typeof Notification === 'undefined') return
    if (Notification.permission === 'granted') {
      syncExistingSubscription().finally(() => {
        localStorage.setItem('alicerce_notification_prompt_completed', 'true')
        setState('hidden')
      })
      return
    }
    setState('prompt')
  }

  if (state === 'checking' || state === 'hidden') return null

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.65)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1.5rem',
      }}
      aria-modal="true"
      role="dialog"
      aria-labelledby="notif-gate-title"
    >
      <div
        style={{
          background: 'var(--color-surface, #fff)',
          borderRadius: '1rem',
          maxWidth: '26rem',
          width: '100%',
          padding: '2rem',
          display: 'flex', flexDirection: 'column', gap: '1.25rem',
          boxShadow: '0 8px 40px rgba(0,0,0,0.3)',
        }}
      >
        {state === 'prompt' || state === 'activating' ? (
          <>
            <div style={{ fontSize: '2.5rem', textAlign: 'center' }}>🔔</div>
            <h2
              id="notif-gate-title"
              style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, textAlign: 'center', color: 'var(--color-ink, #111)' }}
            >
              Ative as notificações para continuar
            </h2>
            <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--color-ink-mid, #555)', textAlign: 'center', lineHeight: 1.6 }}>
              As notificações são necessárias para avisar quando novos relatórios, evoluções, orientações ou comunicados forem publicados.
            </p>
            {erro && (
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#B91C1C', textAlign: 'center' }}>{erro}</p>
            )}
            <button
              type="button"
              onClick={handleAtivar}
              disabled={state === 'activating'}
              style={{
                background: 'var(--color-rose-main, #D4716A)',
                color: '#fff',
                border: 'none',
                borderRadius: '0.625rem',
                padding: '0.875rem 1.5rem',
                fontWeight: 600,
                fontSize: '1rem',
                cursor: state === 'activating' ? 'wait' : 'pointer',
                opacity: state === 'activating' ? 0.7 : 1,
              }}
            >
              {state === 'activating' ? 'Aguarde...' : 'Ativar notificações'}
            </button>
          </>
        ) : (
          <>
            <div style={{ fontSize: '2.5rem', textAlign: 'center' }}>🔕</div>
            <h2
              id="notif-gate-title"
              style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, textAlign: 'center', color: 'var(--color-ink, #111)' }}
            >
              Notificações bloqueadas
            </h2>
            <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--color-ink-mid, #555)', textAlign: 'center', lineHeight: 1.6 }}>
              Para usar o aplicativo corretamente, libere as notificações nas configurações do navegador ou do aplicativo instalado.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={handleTentarNovamente}
                style={{
                  background: 'var(--color-rose-main, #D4716A)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '0.625rem',
                  padding: '0.875rem 1.5rem',
                  fontWeight: 600,
                  fontSize: '1rem',
                  cursor: 'pointer',
                }}
              >
                Tentar novamente
              </button>
              <button
                type="button"
                onClick={handleVerificarPermissao}
                style={{
                  background: 'transparent',
                  color: 'var(--color-rose-main, #D4716A)',
                  border: '1.5px solid var(--color-rose-main, #D4716A)',
                  borderRadius: '0.625rem',
                  padding: '0.875rem 1.5rem',
                  fontWeight: 600,
                  fontSize: '1rem',
                  cursor: 'pointer',
                }}
              >
                Já liberei, verificar novamente
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
