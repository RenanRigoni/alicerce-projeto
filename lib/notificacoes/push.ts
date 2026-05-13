import webpush from 'web-push'
import { createAdminClient } from '@/lib/supabase/admin'

type PushPayload = {
  title: string
  body?: string | null
  url?: string | null
  notificationId?: string
}

type StoredSubscription = {
  id: string
  user_id: string
  endpoint: string
  p256dh: string
  auth: string
}

let vapidConfigured = false

function configureWebPush() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  const subject = process.env.VAPID_SUBJECT || 'mailto:contato@alicerceapp.com'

  if (!publicKey || !privateKey) {
    return { ok: false, error: 'VAPID keys nao configuradas.' }
  }

  if (!vapidConfigured) {
    webpush.setVapidDetails(subject, publicKey, privateKey)
    vapidConfigured = true
  }

  return { ok: true as const }
}

function isInvalidSubscriptionError(error: unknown) {
  const statusCode = (error as { statusCode?: number } | null)?.statusCode
  return statusCode === 404 || statusCode === 410
}

export async function sendPushToUsers(userIds: string[], payload: PushPayload) {
  const uniqueUserIds = Array.from(new Set(userIds.filter(Boolean)))
  if (uniqueUserIds.length === 0) return { sentAt: null, error: null }

  const vapid = configureWebPush()
  if (!vapid.ok) return { sentAt: null, error: vapid.error }

  const db = createAdminClient()
  const { data: subscriptions, error } = await db
    .from('push_subscriptions')
    .select('id, user_id, endpoint, p256dh, auth')
    .in('user_id', uniqueUserIds)

  if (error) return { sentAt: null, error: error.message }
  if (!subscriptions?.length) return { sentAt: null, error: 'Nenhum dispositivo com push ativo.' }

  const invalidSubscriptionIds: string[] = []
  const failures: string[] = []

  await Promise.all((subscriptions as StoredSubscription[]).map(async (subscription) => {
    try {
      await webpush.sendNotification(
        {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.p256dh,
            auth: subscription.auth,
          },
        },
        JSON.stringify({
          title: payload.title,
          body: 'Acesse o sistema para visualizar.',
          icon: '/icons/icon-192.png',
          badge: '/icons/icon-96.png',
          url: payload.url || '/',
          notificationId: payload.notificationId,
        })
      )
    } catch (error) {
      if (isInvalidSubscriptionError(error)) {
        invalidSubscriptionIds.push(subscription.id)
        return
      }

      failures.push(error instanceof Error ? error.message : 'Erro desconhecido no envio push.')
    }
  }))

  if (invalidSubscriptionIds.length > 0) {
    await db.from('push_subscriptions').delete().in('id', invalidSubscriptionIds)
  }

  const sentAt = new Date().toISOString()
  return {
    sentAt,
    error: failures.length > 0 ? failures.slice(0, 3).join(' | ') : null,
  }
}
