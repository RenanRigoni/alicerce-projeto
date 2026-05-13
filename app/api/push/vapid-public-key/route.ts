import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function GET() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  if (!publicKey) {
    return NextResponse.json({ error: 'Chave pública VAPID não configurada.' }, { status: 503 })
  }

  return NextResponse.json({ publicKey })
}
