import { createClient as createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Apenas administradores podem rotar a chave CPF' }, { status: 403 })
  }

  const body = await request.json()
  const { nova_chave } = body

  if (!nova_chave || typeof nova_chave !== 'string' || nova_chave.length < 32) {
    return NextResponse.json({ error: 'nova_chave deve ter pelo menos 32 caracteres' }, { status: 400 })
  }

  const adminClient = createAdminClient()

  const { data: count, error } = await adminClient.rpc('rotar_chave_cpf', { nova_chave })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, registros_re_encriptados: count })
}
