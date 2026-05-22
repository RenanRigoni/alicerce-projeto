'use client'

import { useState, useEffect } from 'react'

export type PushStatus = 'checking' | 'unsupported' | 'denied' | 'inactive' | 'active' | 'saving'

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

export function isPushSupported() {
  return (
    typeof window !== 'undefined'
    && 'serviceWorker' in navigator
    && 'PushManager' in window
    && 'Notification' in window
  )
}

export async function subscribeToPush(): Promise<{ status: 'active' | 'denied' | 'inactive'; error?: string }> {
  if (!isPushSupported()) return { status: 'inactive', error: 'Dispositivo não suporta notificações.' }

  try {
    const permission = await Notification.requestPermission()
    if (permission === 'denied') return { status: 'denied' }
    if (permission !== 'granted') return { status: 'inactive' }

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

    return { status: 'active' }
  } catch (error) {
    return { status: 'inactive', error: error instanceof Error ? error.message : 'Erro ao ativar notificações.' }
  }
}

export function usePushNotifications() {
  const [status, setStatus] = useState<PushStatus>('checking')
  const [erro, setErro] = useState('')

  useEffect(() => {
    let mounted = true

    async function checkStatus() {
      if (!isPushSupported()) {
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
        if (subscription) {
          fetch('/api/push/subscription', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ subscription }),
          }).catch(() => {})
        }
      } catch {
        if (mounted) setStatus('inactive')
      }
    }

    checkStatus()
    return () => { mounted = false }
  }, [])

  async function ativar() {
    setErro('')
    setStatus('saving')
    const result = await subscribeToPush()
    if (result.status === 'active') setStatus('active')
    else if (result.status === 'denied') setStatus('denied')
    else { setStatus('inactive'); setErro(result.error ?? '') }
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

  return { status, erro, ativar, desativar }
}
