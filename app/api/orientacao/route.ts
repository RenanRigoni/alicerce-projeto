import { createClient as createServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { notificarResponsaveisDoPaciente } from '@/lib/notificacoes/inserir'
import { gerarHash } from '@/lib/hash/gerar-hash'

export async function POST(request: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'terapeuta') {
    return NextResponse.json({ error: 'Apenas terapeutas podem criar orientações' }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  const { paciente_id, titulo, tipo, url_midia, conteudo } = body

  if (!paciente_id || !titulo?.trim()) {
    return NextResponse.json({ error: 'Paciente e título são obrigatórios.' }, { status: 400 })
  }

  // Terapeuta deve estar vinculado ao paciente
  const { data: vinculo } = await supabase
    .from('paciente_terapeutas')
    .select('terapeuta_id')
    .eq('paciente_id', paciente_id)
    .eq('terapeuta_id', user.id)
    .maybeSingle()
  if (!vinculo) {
    return NextResponse.json({ error: 'Sem vínculo com este paciente' }, { status: 403 })
  }

  // Prontuário encerrado — bloqueia novas orientações (COFFITO: só leitura após alta)
  const { data: paciente } = await supabase.from('pacientes').select('status').eq('id', paciente_id).single()
  if (paciente && paciente.status !== 'ativo') {
    return NextResponse.json({ error: 'Prontuário encerrado. Não é possível criar orientações para paciente inativo.' }, { status: 409 })
  }

  const tiposValidos = ['texto', 'video', 'pdf', 'imagem', 'guia']
  const tipoFinal = tiposValidos.includes(tipo) ? tipo : 'texto'

  const agora = new Date().toISOString()
  const hash = await gerarHash({
    paciente_id,
    terapeuta_id: user.id,
    titulo: titulo.trim(),
    tipo: tipoFinal,
    conteudo: conteudo?.trim() ?? null,
    url_midia: url_midia?.trim() ?? null,
    assinado_em: agora,
  })

  const { error } = await supabase.from('orientacoes').insert({
    paciente_id,
    terapeuta_id: user.id,
    titulo: titulo.trim(),
    tipo: tipoFinal,
    url_midia: url_midia?.trim() || null,
    conteudo: conteudo?.trim() || null,
    hash_integridade: hash,
    assinado_em: agora,
  })

  if (error) {
    return NextResponse.json({ error: 'Erro ao salvar orientação.' }, { status: 500 })
  }

  await notificarResponsaveisDoPaciente(
    paciente_id,
    'orientacao_nova',
    `Nova orientação: ${titulo.trim()}`,
    conteudo?.trim().slice(0, 120) || undefined,
    `/portal/paciente/${paciente_id}?aba=orientacoes`
  )

  return NextResponse.json({ success: true })
}
