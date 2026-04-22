import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { createElement } from 'react'
import { TemplateRelatorio } from '@/lib/pdf/template-relatorio'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

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
      profiles(nome)
    `)
    .eq('id', id)
    .single()

  if (relErr || !relatorio) {
    return NextResponse.json({ error: 'Relatório não encontrado' }, { status: 404 })
  }

  // Apenas o terapeuta dono ou admin pode gerar o PDF
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

  // Extrai diagnóstico de dados_clinicos (relação aninhada)
  const pacienteRaw = relatorio.pacientes as any
  const paciente = {
    nome: pacienteRaw?.nome,
    data_nascimento: pacienteRaw?.data_nascimento,
    frequencia_atendimento: pacienteRaw?.frequencia_atendimento,
    diagnostico: pacienteRaw?.pacientes_dados_clinicos?.diagnostico ?? null,
  }

  // Gera o PDF
  const pdfBuffer = await renderToBuffer(
    createElement(TemplateRelatorio, {
      paciente,
      relatorio,
      terapeuta: relatorio.profiles as any,
    }) as any
  )

  // Faz upload para o Supabase Storage
  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const path = `${relatorio.paciente_id}/${id}.pdf`

  await adminClient.storage
    .from('relatorios-pdf')
    .upload(path, pdfBuffer, {
      contentType: 'application/pdf',
      upsert: true,
    })

  // Gera URL assinada (válida por 1 hora)
  const { data: signedUrl } = await adminClient.storage
    .from('relatorios-pdf')
    .createSignedUrl(path, 3600)

  // Salva a referência do PDF no banco
  await adminClient
    .from('relatorios')
    .update({ pdf_url: path })
    .eq('id', id)

  return NextResponse.json({ url: signedUrl?.signedUrl })
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

  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data: signed } = await adminClient.storage
    .from('relatorios-pdf')
    .createSignedUrl(relatorio.pdf_url, 3600)

  if (!signed?.signedUrl) {
    return NextResponse.json({ error: 'Erro ao gerar link de download' }, { status: 500 })
  }

  return NextResponse.redirect(signed.signedUrl)
}
