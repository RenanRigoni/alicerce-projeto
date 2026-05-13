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
  type InfoAutenticacao,
} from '@/lib/pdf/autenticar-pdf'
import { formatarConselhoProfissional } from '@/lib/profissionais'

type DocumentoClinicoPdfConfig = {
  table: 'relatorios' | 'evolucoes'
  apiSegment: 'relatorio' | 'evolucao'
  documentTitle: string
  entityLabel: string
  storagePath: (pacienteId: string, id: string) => string
}

export const relatorioPdfConfig: DocumentoClinicoPdfConfig = {
  table: 'relatorios',
  apiSegment: 'relatorio',
  documentTitle: 'Relatório clínico',
  entityLabel: 'Relatorio',
  storagePath: (pacienteId, id) => `${pacienteId}/${id}.pdf`,
}

export const evolucaoPdfConfig: DocumentoClinicoPdfConfig = {
  table: 'evolucoes',
  apiSegment: 'evolucao',
  documentTitle: 'Evolução clínica',
  entityLabel: 'Evolucao',
  storagePath: (pacienteId, id) => `${pacienteId}/evolucoes/${id}.pdf`,
}

export async function handleDocumentoClinicoPdfPost(
  request: NextRequest,
  id: string,
  config: DocumentoClinicoPdfConfig
) {
  const body = await request.json().catch(() => ({})) as { sourcePath?: string | null }

  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })

  const { data: documento, error: docErr } = await supabase
    .from(config.table)
    .select(`
      *,
      pacientes(nome, data_nascimento, frequencia_atendimento, pacientes_dados_clinicos(diagnostico)),
      profiles(nome, crefito, tipo_profissional, conselho_tipo, conselho_numero)
    `)
    .eq('id', id)
    .single()

  if (docErr || !documento) {
    return NextResponse.json({ error: `${config.entityLabel} nao encontrado.` }, { status: 404 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const isOwner = documento.terapeuta_id === user.id
  const isAdmin = profile?.role === 'admin'
  const isPai = profile?.role === 'pai'

  if (!isOwner && !isAdmin && !isPai) {
    return NextResponse.json({ error: 'Sem permissao' }, { status: 403 })
  }
  if (body.sourcePath && !isOwner && !isAdmin) {
    return NextResponse.json({ error: 'Sem permissao para autenticar PDF anexado' }, { status: 403 })
  }

  const hashIntegridade = typeof documento.hash_integridade === 'string'
    ? documento.hash_integridade.trim()
    : ''
  if (!hashIntegridade) {
    return NextResponse.json({ error: `${config.entityLabel} sem hash de integridade.` }, { status: 409 })
  }

  const pacienteRaw = documento.pacientes as any
  const paciente = {
    nome: pacienteRaw?.nome,
    data_nascimento: pacienteRaw?.data_nascimento,
    frequencia_atendimento: pacienteRaw?.frequencia_atendimento,
    diagnostico: pacienteRaw?.pacientes_dados_clinicos?.diagnostico ?? null,
  }

  const adminClient = createAdminClient()

  const { data: ultimaSessao } = await adminClient
    .from('sessao_confirmacoes')
    .select('data_hora')
    .eq('paciente_id', documento.paciente_id)
    .in('status', ['confirmada', 'expirada'])
    .order('data_hora', { ascending: false })
    .limit(1)
    .maybeSingle()

  let autenticacaoEm: string | null = null
  if (ultimaSessao?.data_hora) {
    const tsAuth = new Date(new Date(ultimaSessao.data_hora).getTime() + 50 * 60 * 1000)
    autenticacaoEm = tsAuth.toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
      timeZone: 'America/Sao_Paulo',
    })
  }

  const terapeutaProfile = documento.profiles as any
  const conselhoStr = formatarConselhoProfissional({
    tipoProfissional: terapeutaProfile?.tipo_profissional,
    conselhoTipo: terapeutaProfile?.conselho_tipo,
    conselhoNumero: terapeutaProfile?.conselho_numero,
    crefitoLegado: terapeutaProfile?.crefito,
  })

  const authInfo: InfoAutenticacao = {
    hash: hashIntegridade,
    terapeuta: terapeutaProfile?.nome,
    conselho: conselhoStr ?? undefined,
    autenticacaoEm: autenticacaoEm ?? undefined,
  }

  const path = config.storagePath(documento.paciente_id, id)
  const sourcePath = typeof body.sourcePath === 'string' ? body.sourcePath : null
  let pdfBuffer: Buffer
  let geradoPeloSistema = false

  if (sourcePath && (isPdfPath(sourcePath) || isImagePath(sourcePath))) {
    const { data: originalFile, error: downloadError } = await adminClient.storage
      .from('relatorios-pdf')
      .download(sourcePath)

    if (downloadError || !originalFile) {
      return NextResponse.json({ error: 'Erro ao ler anexo para autenticacao.' }, { status: 500 })
    }

    try {
      const originalBytes = new Uint8Array(await originalFile.arrayBuffer())
      pdfBuffer = isPdfPath(sourcePath)
        ? await inserirHashNoRodapePdf(originalBytes, authInfo)
        : await criarPdfAutenticadoDeImagem(originalBytes, sourcePath, authInfo)
    } catch {
      return NextResponse.json({ error: 'Nao foi possivel inserir o hash no anexo.' }, { status: 500 })
    }
  } else {
    geradoPeloSistema = true
    pdfBuffer = await renderToBuffer(
      createElement(TemplateRelatorio, {
        paciente,
        relatorio: { ...documento, autenticacao_em: autenticacaoEm },
        terapeuta: terapeutaProfile,
        documentoTitulo: config.documentTitle,
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
    .from(config.table)
    .update({ pdf_url: path })
    .eq('id', id)

  if (updateError) {
    return NextResponse.json({ error: `PDF autenticado, mas nao foi possivel atualizar ${config.entityLabel}.` }, { status: 500 })
  }

  return NextResponse.json({ url: signedUrl?.signedUrl, path, geradoPeloSistema })
}

export async function handleDocumentoClinicoPdfGet(
  request: NextRequest,
  id: string,
  config: DocumentoClinicoPdfConfig
) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })

  const { data: documento } = await supabase
    .from(config.table)
    .select('pdf_url, paciente_id, terapeuta_id, status')
    .eq('id', id)
    .single()

  if (!documento?.pdf_url) {
    const baseUrl = request.nextUrl.origin
    const res = await fetch(`${baseUrl}/api/${config.apiSegment}/${id}/pdf`, {
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
    .createSignedUrl(documento.pdf_url, 3600)

  if (!signed?.signedUrl) {
    return NextResponse.json({ error: 'Erro ao gerar link de download.' }, { status: 500 })
  }

  return NextResponse.redirect(signed.signedUrl)
}
