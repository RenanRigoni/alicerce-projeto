import { createClient as createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  // RLS na tabela documentos filtra por vínculo paciente_terapeutas / paciente_responsaveis
  // — se o usuário não tem vínculo, a query devolve null
  const { data: documento } = await supabase
    .from('documentos')
    .select('id, arquivo_path, arquivo_url')
    .eq('id', id)
    .maybeSingle()

  if (!documento) {
    return NextResponse.json({ error: 'Documento não encontrado ou sem permissão' }, { status: 404 })
  }

  const path = documento.arquivo_path
  if (!path) {
    return NextResponse.json({ error: 'Documento sem path no storage' }, { status: 500 })
  }

  const adminClient = createAdminClient()
  const { data: signed } = await adminClient.storage
    .from('documentos')
    .createSignedUrl(path, 3600)

  if (!signed?.signedUrl) {
    return NextResponse.json({ error: 'Erro ao gerar link' }, { status: 500 })
  }

  return NextResponse.redirect(signed.signedUrl)
}
