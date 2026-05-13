import { createClient as createServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { notificarTodos } from '@/lib/notificacoes/inserir'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!['admin', 'recepcao'].includes(profile?.role ?? '')) {
    return NextResponse.json({ error: 'Sem permissao' }, { status: 403 })
  }

  const { titulo, conteudo } = await request.json().catch(() => ({}))
  if (!titulo?.trim() || !conteudo?.trim()) {
    return NextResponse.json({ error: 'Titulo e conteudo sao obrigatorios.' }, { status: 400 })
  }

  const { data: comunicado, error } = await supabase
    .from('comunicados')
    .insert({
      titulo: titulo.trim(),
      conteudo: conteudo.trim(),
      criado_por: user.id,
    })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: 'Erro ao publicar comunicado.' }, { status: 500 })

  await notificarTodos(
    'comunicado_publicado',
    'Novo comunicado publicado',
    'Acesse o sistema para visualizar o comunicado.',
    '/',
    {
      notification_type: 'global',
      related_entity_type: 'comunicado',
      related_entity_id: comunicado.id,
    }
  )

  return NextResponse.json({ success: true, id: comunicado.id })
}
