import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
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

  if (!['admin', 'recepcao'].includes(profile?.role ?? '')) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const payload = await request.json()
  const dataFeriado: string = payload.data
  const descricao: string = payload.descricao

  if (!dataFeriado?.trim() || !descricao?.trim()) {
    return NextResponse.json({ error: 'Data e descrição são obrigatórias' }, { status: 400 })
  }

  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { error } = await adminClient.from('feriados').insert({
    data: dataFeriado.trim(),
    descricao: descricao.trim(),
    criado_por: user.id,
  })

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Já existe um feriado cadastrado nesta data.' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Erro ao salvar feriado.' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
