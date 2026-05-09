import { createClient as createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!['admin', 'recepcao', 'terapeuta'].includes(profile?.role ?? '')) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const formData = await request.formData()
  const arquivo = formData.get('arquivo') as File | null
  const pasta = (formData.get('pasta') as string) || 'misc'

  if (!arquivo) return NextResponse.json({ error: 'Arquivo obrigatório.' }, { status: 400 })

  const EXTS_PERMITIDAS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf']
  const ext = arquivo.name.split('.').pop()?.toLowerCase() ?? ''
  if (!EXTS_PERMITIDAS.includes(ext)) {
    return NextResponse.json({ error: `Tipo de arquivo não permitido. Use: ${EXTS_PERMITIDAS.join(', ')}` }, { status: 400 })
  }

  // Whitelist de pastas: 'misc' ou 'orientacoes/<uuid>' (única forma usada hoje)
  const PASTA_MISC_RE = /^[a-zA-Z0-9_\-]+$/
  const PASTA_ORIENTACAO_RE = /^orientacoes\/([0-9a-f-]{36})$/i
  const matchOrientacao = pasta.match(PASTA_ORIENTACAO_RE)
  if (!pasta || (!PASTA_MISC_RE.test(pasta) && !matchOrientacao)) {
    return NextResponse.json({ error: 'Pasta inválida.' }, { status: 400 })
  }

  // Se for upload em pasta de paciente, terapeuta precisa vínculo
  if (matchOrientacao && profile?.role === 'terapeuta') {
    const pacienteId = matchOrientacao[1]
    const { data: vinculo } = await supabase
      .from('paciente_terapeutas')
      .select('terapeuta_id')
      .eq('paciente_id', pacienteId)
      .eq('terapeuta_id', user.id)
      .maybeSingle()
    if (!vinculo) {
      return NextResponse.json({ error: 'Sem vínculo com este paciente' }, { status: 403 })
    }
  }

  const maxBytes = 15 * 1024 * 1024
  if (arquivo.size > maxBytes) {
    return NextResponse.json({ error: 'Arquivo muito grande. Máximo 15 MB.' }, { status: 400 })
  }

  const adminClient = createAdminClient()

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
