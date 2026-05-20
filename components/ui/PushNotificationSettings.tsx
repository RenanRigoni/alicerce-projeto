'use client'

import { useEffect, useState } from 'react'

type Status = 'checking' | 'unsupported' | 'denied' | 'inactive' | 'active' | 'saving'

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i)
  }

  return outputArray
}

function isSupported() {
  return (
    typeof window !== 'undefined'
    && 'serviceWorker' in navigator
    && 'PushManager' in window
    && 'Notification' in window
  )
}

export function PushNotificationSettings() {
  const [status, setStatus] = useState<Status>('checking')
  const [erro, setErro] = useState('')

  async function syncExistingSubscription(subscription: PushSubscription) {
    await fetch('/api/push/subscription', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription }),
    })
  }

  useEffect(() => {
    let mounted = true

    async function checkStatus() {
      if (!isSupported()) {
        if (mounted) setStatus('unsupported')
        return
      }

      if (Notification.permission === 'denied') {
        if (mounted) setStatus('denied')
        return
      }

      try {
        const registration = await navigator.serviceWorker.ready
        const subscription = await registration.pushManager.getSubscription()
        if (!mounted) return
        setStatus(subscription ? 'active' : 'inactive')
        if (subscription) syncExistingSubscription(subscription).catch(() => {})
      } catch {
        if (mounted) setStatus('inactive')
      }
    }

    checkStatus()
    return () => { mounted = false }
  }, [])

  async function ativar() {
    setErro('')

    if (!isSupported()) {
      setStatus('unsupported')
      return
    }

    setStatus('saving')

    try {
      const permission = await Notification.requestPermission()
      if (permission === 'denied') {
        setStatus('denied')
        return
      }
      if (permission !== 'granted') {
        setStatus('inactive')
        return
      }

      const keyResponse = await fetch('/api/push/vapid-public-key')
      const keyJson = await keyResponse.json()
      if (!keyResponse.ok || !keyJson.publicKey) {
        throw new Error(keyJson.error ?? 'Chave pública de notificação indisponível.')
      }

      const registration = await navigator.serviceWorker.ready
      const existing = await registration.pushManager.getSubscription()
      const subscription = existing ?? await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(keyJson.publicKey),
      })

      const response = await fetch('/api/push/subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription }),
      })
      const json = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(json.error ?? 'Não foi possível salvar este dispositivo.')

      setStatus('active')
    } catch (error) {
      setStatus('inactive')
      setErro(error instanceof Error ? error.message : 'Erro ao ativar notificações.')
    }
  }

  async function desativar() {
    setErro('')
    setStatus('saving')

    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      if (subscription) {
        await fetch('/api/push/subscription', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        })
        await subscription.unsubscribe()
      }
      setStatus('inactive')
    } catch (error) {
      setStatus('active')
      setErro(error instanceof Error ? error.message : 'Erro ao desativar notificações.')
    }
  }

  if (status === 'checking') {
    return <p className="text-xs" style={{ color: 'var(--color-ink-faint)' }}>Verificando notificações...</p>
  }

  if (status === 'unsupported') {
    return <p className="text-xs" style={{ color: 'var(--color-ink-faint)' }}>Este dispositivo não é compatível com notificações push.</p>
  }

  if (status === 'denied') {
    return <p className="text-xs" style={{ color: '#B91C1C' }}>Notificações bloqueadas no navegador.</p>
  }

  const ativo = status === 'active'
  const salvando = status === 'saving'

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs" style={{ color: 'var(--color-ink-mid)' }}>
          Notificações push
        </span>
        <button
          type="button"
          onClick={ativo ? desativar : ativar}
          disabled={salvando}
          aria-checked={ativo}
          role="switch"
          className="relative shrink-0 rounded-full transition-colors duration-200 disabled:opacity-50 overflow-hidden"
          style={{
            width: 40,
            height: 22,
            background: ativo ? 'var(--color-rose-main)' : 'var(--color-border)',
          }}
        >
          <span
            className="absolute top-[2px] left-[2px] w-[18px] h-[18px] bg-white rounded-full transition-transform duration-200"
            style={{ transform: ativo ? 'translateX(18px)' : 'translateX(0px)' }}
          />
        </button>
      </div>
      {erro && <p className="text-xs" style={{ color: '#B91C1C' }}>{erro}</p>}
    </div>
  )
}
