import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

// Rate limit simples em memória (por IP)
const tentativas = new Map<string, { count: number; reset: number }>()

function checkRateLimit(ip: string): boolean {
  const agora = Date.now()
  const entrada = tentativas.get(ip)
  if (!entrada || agora > entrada.reset) {
    tentativas.set(ip, { count: 1, reset: agora + 60_000 })
    return true
  }
  if (entrada.count >= 10) return false
  entrada.count++
  return true
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') ?? 'unknown'
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: 'Muitas tentativas. Aguarde 1 minuto.' }, { status: 429 })
  }

  const body = await request.json().catch(() => null)
  if (!body?.cpf) {
    return NextResponse.json({ error: 'CPF não informado' }, { status: 400 })
  }

  const cpfDigits = String(body.cpf).replace(/\D/g, '')
  if (cpfDigits.length !== 11) {
    return NextResponse.json({ error: 'CPF inválido' }, { status: 400 })
  }

  const adminClient = createAdminClient()

  const { data: profile } = await adminClient
    .from('profiles')
    .select('id')
    .eq('cpf_cnpj', cpfDigits)
    .eq('role', 'pai')
    .eq('ativo', true)
    .single()

  if (!profile) {
    return NextResponse.json({ error: 'CPF não encontrado ou usuário não autorizado' }, { status: 404 })
  }

  const { data: { user } } = await adminClient.auth.admin.getUserById(profile.id)

  if (!user?.email) {
    return NextResponse.json({ error: 'Usuário sem e-mail configurado' }, { status: 404 })
  }

  return NextResponse.json({ email: user.email })
}
