import { createClient as createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { gerarHash } from '@/lib/hash/gerar-hash'

export async function POST(request: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const allowedRoles = ['admin', 'recepcao', 'terapeuta', 'pai']
  if (!allowedRoles.includes(profile?.role ?? '')) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const formData = await request.formData()
  const arquivo = formData.get('arquivo') as File | null
  const pacienteId = formData.get('paciente_id') as string | null
  const tipo = (formData.get('tipo') as string) || 'outro'
  const descricao = (formData.get('descricao') as string) || null
  const visivelPais = formData.get('visivel_pais') !== 'false'

  if (!arquivo || !pacienteId) {
    return NextResponse.json({ error: 'Arquivo e paciente_id são obrigatórios.' }, { status: 400 })
  }

  // Bloqueia path traversal — pacienteId vai compor path no storage
  if (!/^[0-9a-f-]{36}$/i.test(pacienteId)) {
    return NextResponse.json({ error: 'paciente_id inválido' }, { status: 400 })
  }

  // Verifica vínculo com paciente, exceto admin/recepcao
  if (profile?.role === 'terapeuta') {
    const { data: vinculo } = await supabase
      .from('paciente_terapeutas')
      .select('terapeuta_id')
      .eq('paciente_id', pacienteId)
      .eq('terapeuta_id', user.id)
      .maybeSingle()
    if (!vinculo) {
      return NextResponse.json({ error: 'Sem vínculo com este paciente' }, { status: 403 })
    }
  } else if (profile?.role === 'pai') {
    const { data: vinculo } = await supabase
      .from('paciente_responsaveis')
      .select('responsavel_id')
      .eq('paciente_id', pacienteId)
      .eq('responsavel_id', user.id)
      .maybeSingle()
    if (!vinculo) {
      return NextResponse.json({ error: 'Sem vínculo com este paciente' }, { status: 403 })
    }
  }

  const EXTS_PERMITIDAS = ['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx']
  const ext = arquivo.name.split('.').pop()?.toLowerCase() ?? ''
  if (!EXTS_PERMITIDAS.includes(ext)) {
    return NextResponse.json({ error: `Tipo de arquivo não permitido. Use: ${EXTS_PERMITIDAS.join(', ')}` }, { status: 400 })
  }

  // Prontuário encerrado — bloqueia novos documentos (COFFITO: só leitura após alta)
  const { data: paciente } = await supabase.from('pacientes').select('status').eq('id', pacienteId).single()
  if (paciente && paciente.status !== 'ativo') {
    return NextResponse.json({ error: 'Prontuário encerrado. Não é possível adicionar documentos a paciente inativo.' }, { status: 409 })
  }

  const maxBytes = 15 * 1024 * 1024 // 15 MB
  if (arquivo.size > maxBytes) {
    return NextResponse.json({ error: 'Arquivo muito grande. Máximo 15 MB.' }, { status: 400 })
  }

  const adminClient = createAdminClient()

  const path = `${pacienteId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`

  const arrayBuffer = await arquivo.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  const { error: uploadError } = await adminClient.storage
    .from('documentos')
    .upload(path, buffer, {
      contentType: arquivo.type || 'application/octet-stream',
      upsert: false,
    })

  if (uploadError) {
    return NextResponse.json({ error: `Erro ao enviar arquivo: ${uploadError.message}` }, { status: 500 })
  }

  const agora = new Date().toISOString()
  const hash = await gerarHash({
    paciente_id: pacienteId,
    enviado_por: user.id,
    tipo,
    descricao: descricao?.trim() ?? null,
    arquivo_path: path,
    assinado_em: agora,
  })

  const { data: docInserido, error: dbError } = await adminClient.from('documentos').insert({
    paciente_id: pacienteId,
    enviado_por: user.id,
    tipo,
    descricao: descricao?.trim() || null,
    arquivo_url: '', // legacy, mantido por compat
    arquivo_path: path,
    visivel_pais: visivelPais,
    hash_integridade: hash,
    assinado_em: agora,
  }).select('id').single()

  if (dbError || !docInserido) {
    return NextResponse.json({ error: 'Erro ao salvar registro do documento.' }, { status: 500 })
  }

  return NextResponse.json({ success: true, id: docInserido.id, url: `/api/documento/${docInserido.id}/download` })
}
