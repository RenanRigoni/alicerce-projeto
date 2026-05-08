import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { POLICY_VERSION } from '@/lib/consentimento'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const policy_versao: string = body?.policy_versao ?? POLICY_VERSION

  if (policy_versao !== POLICY_VERSION) {
    return NextResponse.json({ error: `Versão de política inválida. Use: ${POLICY_VERSION}` }, { status: 400 })
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      consentimento_aceito_em: new Date().toISOString(),
      consentimento_policy_versao: policy_versao,
    })
    .eq('id', user.id)

  if (error) return NextResponse.json({ error: 'Erro ao registrar consentimento.' }, { status: 500 })

  return NextResponse.json({ success: true })
}
