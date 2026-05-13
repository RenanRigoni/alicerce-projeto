import { createClient as createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { notificarTodos } from '@/lib/notificacoes/inserir'

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

  const payload = await request.json().catch(() => null)
  if (!payload) return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  const dataFeriado: string = payload.data
  const descricao: string = payload.descricao
  const anual: boolean = payload.anual === true

  if (!dataFeriado?.trim() || !descricao?.trim()) {
    return NextResponse.json({ error: 'Data e descrição são obrigatórias' }, { status: 400 })
  }

  const adminClient = createAdminClient()

  const { data: feriado, error } = await adminClient.from('feriados').insert({
    data: dataFeriado.trim(),
    descricao: descricao.trim(),
    anual,
    criado_por: user.id,
  }).select('id').single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Já existe um feriado cadastrado nesta data.' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Erro ao salvar feriado.' }, { status: 500 })
  }

  await notificarTodos(
    'feriado_publicado',
    'Feriado cadastrado',
    'Acesse o sistema para visualizar o aviso institucional.',
    '/',
    {
      notification_type: 'global',
      related_entity_type: 'feriado',
      related_entity_id: feriado.id,
    }
  )

  return NextResponse.json({ success: true })
}
