import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const formData = await request.formData()
  const arquivo = formData.get('arquivo') as File | null
  const pasta = (formData.get('pasta') as string) || 'misc'

  if (!arquivo) return NextResponse.json({ error: 'Arquivo obrigatório.' }, { status: 400 })

  const maxBytes = 15 * 1024 * 1024
  if (arquivo.size > maxBytes) {
    return NextResponse.json({ error: 'Arquivo muito grande. Máximo 15 MB.' }, { status: 400 })
  }

  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const ext = arquivo.name.split('.').pop()?.toLowerCase() ?? 'bin'
  const path = `${pasta}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`

  const buffer = Buffer.from(await arquivo.arrayBuffer())

  const { error: uploadError } = await adminClient.storage
    .from('documentos')
    .upload(path, buffer, {
      contentType: arquivo.type || 'application/octet-stream',
      upsert: false,
    })

  if (uploadError) {
    return NextResponse.json({ error: `Erro ao enviar: ${uploadError.message}` }, { status: 500 })
  }

  const { data: { publicUrl } } = adminClient.storage.from('documentos').getPublicUrl(path)
  return NextResponse.json({ url: publicUrl })
}
