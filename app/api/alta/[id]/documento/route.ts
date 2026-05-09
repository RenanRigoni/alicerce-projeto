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

  // RLS na tabela solicitacoes_alta filtra acesso
  const { data: solic } = await supabase
    .from('solicitacoes_alta')
    .select('id, documento_path, documento_url')
    .eq('id', id)
    .maybeSingle()

  if (!solic) {
    return NextResponse.json({ error: 'Solicitação não encontrada ou sem permissão' }, { status: 404 })
  }

  const path = solic.documento_path
  if (!path) {
    return NextResponse.json({ error: 'Solicitação sem documento anexado' }, { status: 404 })
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
