import { createClient as createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

type PushSubscriptionBody = {
  endpoint?: string
  keys?: {
    p256dh?: string
    auth?: string
  }
}

async function getUserId() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user?.id ?? null
}

export async function GET() {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })

  const { data, error } = await createAdminClient()
    .from('push_subscriptions')
    .select('id, endpoint, atualizado_em')
    .eq('user_id', userId)
    .order('atualizado_em', { ascending: false })

  if (error) return NextResponse.json({ error: 'Erro ao consultar inscricoes push.' }, { status: 500 })
  return NextResponse.json({ subscriptions: data ?? [] })
}

export async function POST(request: NextRequest) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })

  const body = await request.json().catch(() => null) as { subscription?: PushSubscriptionBody } | null
  const subscription = body?.subscription
  const endpoint = subscription?.endpoint?.trim()
  const p256dh = subscription?.keys?.p256dh?.trim()
  const auth = subscription?.keys?.auth?.trim()

  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json({ error: 'Subscription push invalida.' }, { status: 400 })
  }

  const { error } = await createAdminClient()
    .from('push_subscriptions')
    .upsert({
      user_id: userId,
      endpoint,
      p256dh,
      auth,
      user_agent: request.headers.get('user-agent'),
      ultimo_uso_em: new Date().toISOString(),
    }, { onConflict: 'endpoint' })

  if (error) return NextResponse.json({ error: 'Erro ao salvar inscricao push.' }, { status: 500 })
  return NextResponse.json({ success: true })
}

export async function DELETE(request: NextRequest) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })

  const body = await request.json().catch(() => null) as { endpoint?: string } | null
  const endpoint = body?.endpoint?.trim()
  if (!endpoint) return NextResponse.json({ error: 'Endpoint obrigatorio.' }, { status: 400 })

  const { error } = await createAdminClient()
    .from('push_subscriptions')
    .delete()
    .eq('user_id', userId)
    .eq('endpoint', endpoint)

  if (error) return NextResponse.json({ error: 'Erro ao remover inscricao push.' }, { status: 500 })
  return NextResponse.json({ success: true })
}
