'use client'

import { usePushNotifications } from '@/hooks/usePushNotifications'

export function PushNotificationSettings() {
  const { status, erro, ativar, desativar } = usePushNotifications()

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
