import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { SupabaseClient } from '@supabase/supabase-js'

type RefTipo = 'relatorio' | 'documento'

// Confirma que o usuário tem visibilidade do recurso referenciado.
// Aproveita RLS — se a query retornar 0 linhas, usuário não tem acesso.
async function podeAcessarRef(
  supabase: SupabaseClient,
  ref_tipo: RefTipo,
  ref_id: string,
): Promise<boolean> {
  const tabela = ref_tipo === 'relatorio' ? 'relatorios' : 'documentos'
  const { data } = await supabase.from(tabela).select('id').eq('id', ref_id).maybeSingle()
  return !!data
}

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const ref_tipo = searchParams.get('ref_tipo') as RefTipo | null
  const ref_id = searchParams.get('ref_id')

  if (!ref_tipo || !['relatorio', 'documento'].includes(ref_tipo)) {
    return NextResponse.json({ error: 'ref_tipo inválido. Use: relatorio | documento' }, { status: 400 })
  }
  if (!ref_id) {
    return NextResponse.json({ error: 'ref_id obrigatório' }, { status: 400 })
  }

  if (!(await podeAcessarRef(supabase, ref_tipo, ref_id))) {
    return NextResponse.json({ error: 'Sem permissão para este recurso' }, { status: 403 })
  }

  const { data, error } = await supabase
    .from('comentarios')
    .select('id, conteudo, criado_em, autor:profiles(id, nome, role)')
    .eq('ref_tipo', ref_tipo)
    .eq('ref_id', ref_id)
    .order('criado_em', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Body inválido' }, { status: 400 })

  const { ref_tipo, ref_id, conteudo } = body as {
    ref_tipo: RefTipo
    ref_id: string
    conteudo: string
  }

  if (!ref_tipo || !['relatorio', 'documento'].includes(ref_tipo)) {
    return NextResponse.json({ error: 'ref_tipo inválido. Use: relatorio | documento' }, { status: 400 })
  }
  if (!ref_id) return NextResponse.json({ error: 'ref_id obrigatório' }, { status: 400 })
  if (!conteudo?.trim()) return NextResponse.json({ error: 'conteudo obrigatório' }, { status: 400 })

  if (!(await podeAcessarRef(supabase, ref_tipo, ref_id))) {
    return NextResponse.json({ error: 'Sem permissão para comentar neste recurso' }, { status: 403 })
  }

  const { data, error } = await supabase
    .from('comentarios')
    .insert({ ref_tipo, ref_id, conteudo: conteudo.trim(), autor_id: user.id })
    .select('id, conteudo, criado_em')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data, { status: 201 })
}
