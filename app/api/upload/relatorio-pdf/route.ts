import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!['admin', 'terapeuta'].includes(profile?.role ?? '')) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const formData = await request.formData()
  const arquivo = formData.get('arquivo') as File | null
  const pacienteId = formData.get('paciente_id') as string | null

  if (!arquivo || !pacienteId) {
    return NextResponse.json({ error: 'arquivo e paciente_id obrigatórios' }, { status: 400 })
  }

  const maxBytes = 15 * 1024 * 1024
  if (arquivo.size > maxBytes) {
    return NextResponse.json({ error: 'Arquivo muito grande. Máximo 15 MB.' }, { status: 400 })
  }

  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const ext = arquivo.name.split('.').pop()?.toLowerCase() ?? 'pdf'
  const path = `${pacienteId}/draft_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`

  const arrayBuffer = await arquivo.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  const { error: uploadError } = await adminClient.storage
    .from('relatorios-pdf')
    .upload(path, buffer, {
      contentType: arquivo.type || 'application/pdf',
      upsert: false,
    })

  if (uploadError) {
    return NextResponse.json({ error: `Erro ao enviar arquivo: ${uploadError.message}` }, { status: 500 })
  }

  return NextResponse.json({ path })
}
