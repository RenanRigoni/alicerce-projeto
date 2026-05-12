import { createClient as createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { createElement } from 'react'
import { TemplateRelatorio } from '@/lib/pdf/template-relatorio'
import {
  criarPdfAutenticadoDeImagem,
  inserirHashNoRodapePdf,
  isImagePath,
  isPdfPath,
} from '@/lib/pdf/autenticar-pdf'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json().catch(() => ({})) as { sourcePath?: string | null }

  // Verifica autenticação
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  // Busca o relatório com dados do paciente e terapeuta
  const { data: relatorio, error: relErr } = await supabase
    .from('relatorios')
    .select(`
      *,
      pacientes(nome, data_nascimento, frequencia_atendimento, pacientes_dados_clinicos(diagnostico)),
      profiles(nome, crefito, tipo_profissional, conselho_tipo, conselho_numero)
    `)
    .eq('id', id)
    .single()

  if (relErr || !relatorio) {
    return NextResponse.json({ error: 'Relatório não encontrado' }, { status: 404 })
  }

  // Apenas o terapeuta dono ou admin pode gerar/autenticar o PDF.
  // Pai continua podendo acionar a geracao sob demanda quando nao existe PDF salvo.
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const isOwner = relatorio.terapeuta_id === user.id
  const isAdmin = profile?.role === 'admin'
  const isPai = profile?.role === 'pai'

  if (!isOwner && !isAdmin && !isPai) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }
  if (body.sourcePath && !isOwner && !isAdmin) {
    return NextResponse.json({ error: 'Sem permissão para autenticar PDF anexado' }, { status: 403 })
  }

  const hashIntegridade = typeof relatorio.hash_integridade === 'string'
    ? relatorio.hash_integridade.trim()
    : ''
  if (!hashIntegridade) {
    return NextResponse.json({ error: 'Relatório sem hash de integridade.' }, { status: 409 })
  }

  // Extrai diagnóstico de dados_clinicos (relação aninhada)
  const pacienteRaw = relatorio.pacientes as any
  const paciente = {
    nome: pacienteRaw?.nome,
    data_nascimento: pacienteRaw?.data_nascimento,
    frequencia_atendimento: pacienteRaw?.frequencia_atendimento,
    diagnostico: pacienteRaw?.pacientes_dados_clinicos?.diagnostico ?? null,
  }

  const adminClient = createAdminClient()

  const path = `${relatorio.paciente_id}/${id}.pdf`
  const sourcePath = typeof body.sourcePath === 'string' ? body.sourcePath : null
  let pdfBuffer: Buffer
  let geradoPeloSistema = false

  if (sourcePath && (isPdfPath(sourcePath) || isImagePath(sourcePath))) {
    const { data: originalFile, error: downloadError } = await adminClient.storage
      .from('relatorios-pdf')
      .download(sourcePath)

    if (downloadError || !originalFile) {
      return NextResponse.json({ error: 'Erro ao ler anexo para autenticação' }, { status: 500 })
    }

    try {
      const originalBytes = new Uint8Array(await originalFile.arrayBuffer())
      pdfBuffer = isPdfPath(sourcePath)
        ? await inserirHashNoRodapePdf(originalBytes, hashIntegridade)
        : await criarPdfAutenticadoDeImagem(originalBytes, sourcePath, hashIntegridade)
    } catch {
      return NextResponse.json({ error: 'Não foi possível inserir o hash no anexo.' }, { status: 500 })
    }
  } else {
    geradoPeloSistema = true
    pdfBuffer = await renderToBuffer(
      createElement(TemplateRelatorio, {
        paciente,
        relatorio,
        terapeuta: relatorio.profiles as any,
      }) as any
    )
  }

  const { error: uploadError } = await adminClient.storage
    .from('relatorios-pdf')
    .upload(path, pdfBuffer, {
      contentType: 'application/pdf',
      upsert: true,
    })

  if (uploadError) {
    return NextResponse.json({ error: `Erro ao salvar PDF autenticado: ${uploadError.message}` }, { status: 500 })
  }

  if (sourcePath && sourcePath !== path) {
    await adminClient.storage.from('relatorios-pdf').remove([sourcePath])
  }

  const { data: signedUrl } = await adminClient.storage
    .from('relatorios-pdf')
    .createSignedUrl(path, 3600)

  const { error: updateError } = await adminClient
    .from('relatorios')
    .update({ pdf_url: path })
    .eq('id', id)

  if (updateError) {
    return NextResponse.json({ error: 'PDF autenticado, mas não foi possível atualizar o relatório.' }, { status: 500 })
  }

  return NextResponse.json({ url: signedUrl?.signedUrl, path, geradoPeloSistema })
}

// GET — baixa o PDF (gera URL assinada a partir do path salvo)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { data: relatorio } = await supabase
    .from('relatorios')
    .select('pdf_url, paciente_id, terapeuta_id, status')
    .eq('id', id)
    .single()

  if (!relatorio?.pdf_url) {
    // PDF ainda não gerado — gera agora
    const baseUrl = request.nextUrl.origin
    const res = await fetch(`${baseUrl}/api/relatorio/${id}/pdf`, {
      method: 'POST',
      headers: { cookie: request.headers.get('cookie') ?? '' },
    })
    const json = await res.json()
    if (!res.ok) return NextResponse.json({ error: json.error }, { status: res.status })

    return NextResponse.redirect(json.url)
  }

  const adminClient = createAdminClient()

  const { data: signed } = await adminClient.storage
    .from('relatorios-pdf')
    .createSignedUrl(relatorio.pdf_url, 3600)

  if (!signed?.signedUrl) {
    return NextResponse.json({ error: 'Erro ao gerar link de download' }, { status: 500 })
  }

  return NextResponse.redirect(signed.signedUrl)
}
