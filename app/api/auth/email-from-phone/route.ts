import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

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
  if (!body?.telefone) {
    return NextResponse.json({ error: 'Telefone não informado' }, { status: 400 })
  }

  const telefoneDigits = String(body.telefone).replace(/\D/g, '')
  if (telefoneDigits.length < 10 || telefoneDigits.length > 11) {
    return NextResponse.json({ error: 'Telefone inválido' }, { status: 400 })
  }

  const adminClient = createAdminClient()

  // Compara pela coluna gerada (só dígitos): parte dos registros tem o telefone
  // gravado formatado, e a comparação direta com telefone_principal nunca casava.
  const { data: detalhes } = await adminClient
    .from('responsaveis_detalhes')
    .select('id')
    .eq('telefone_digits', telefoneDigits)
    .limit(2)

  // Mesmo telefone em dois responsáveis (mesma casa) é ambíguo — sem isso a
  // pessoa só via "telefone não encontrado" e não sabia o que fazer.
  if (detalhes && detalhes.length > 1) {
    return NextResponse.json(
      { error: 'Este telefone está cadastrado para mais de uma pessoa. Entre com o CPF ou o e-mail.' },
      { status: 409 }
    )
  }

  const detalhe = detalhes?.[0] ?? null

  if (!detalhe) {
    return NextResponse.json({ error: 'Telefone não encontrado ou usuário não autorizado' }, { status: 404 })
  }

  const { data: profile } = await adminClient
    .from('profiles')
    .select('ativo, role')
    .eq('id', detalhe.id)
    .maybeSingle()

  if (!profile || !profile.ativo || profile.role !== 'pai') {
    return NextResponse.json({ error: 'Telefone não encontrado ou usuário não autorizado' }, { status: 404 })
  }

  const { data: { user } } = await adminClient.auth.admin.getUserById(detalhe.id)

  if (!user?.email) {
    return NextResponse.json({ error: 'Usuário sem e-mail configurado' }, { status: 404 })
  }

  return NextResponse.json({ email: user.email })
}
