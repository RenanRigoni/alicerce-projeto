import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { gerarHash } from '@/lib/hash/gerar-hash'

// Orientação é dica que a profissional passa ao responsável pelo portal. Não é registro de
// atendimento (`evolucoes`) nem documento emitido e entregue (`relatorios`), então não está sob
// a guarda obrigatória de prontuário: a autora edita e apaga as dela. Admin e recepção já
// podiam, pela policy "orientacoes: gestão admin".
//
// As duas rotas conferem a autoria aqui E leem quantas linhas o banco mexeu. O segundo cuidado
// é o que importa: sob RLS, uma escrita barrada afeta 0 linhas SEM erro, e sem `.select()` a
// rota respondia `{ success: true }` sem ter salvo nada. Depois da alta a RESTRICTIVE
// `somente_leitura_pos_alta` barra as duas, e é nesse caso que o 0 aparece hoje.

/** Dados de autoria e o status do paciente, que decide se o prontuário ainda aceita escrita. */
async function carregarOrientacao(supabase: Awaited<ReturnType<typeof createClient>>, id: string) {
  const { data } = await supabase
    .from('orientacoes')
    .select('terapeuta_id, paciente_id, assinado_em, pacientes(status)')
    .eq('id', id)
    .single()
  if (!data) return null
  const paciente = Array.isArray(data.pacientes) ? data.pacientes[0] : data.pacientes
  return { ...data, statusPaciente: (paciente as { status: string } | null)?.status ?? null }
}

const ERRO_ENCERRADO = 'Prontuário encerrado. Orientações de paciente inativo são somente leitura.'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const ori = await carregarOrientacao(supabase, id)
  if (!ori) return NextResponse.json({ error: 'Orientação não encontrada' }, { status: 404 })
  if (ori.terapeuta_id !== user.id) {
    return NextResponse.json({ error: 'Só quem escreveu a orientação pode editá-la.' }, { status: 403 })
  }
  if (ori.statusPaciente !== 'ativo') {
    return NextResponse.json({ error: ERRO_ENCERRADO }, { status: 409 })
  }

  const { titulo, tipo, url_midia, conteudo } = await request.json()
  if (!titulo?.trim()) return NextResponse.json({ error: 'Título é obrigatório.' }, { status: 400 })

  const tiposValidos = ['texto', 'video', 'pdf', 'imagem', 'guia']
  const tipoFinal = tiposValidos.includes(tipo) ? tipo : 'texto'

  // O hash acompanha o conteúdo: editou, reassina. Em orientação ele serve de soma de
  // verificação do que está gravado, não de prova de imutabilidade — essa é de `evolucoes`.
  const hash = await gerarHash({
    paciente_id: ori.paciente_id,
    terapeuta_id: user.id,
    titulo: titulo.trim(),
    tipo: tipoFinal,
    conteudo: conteudo?.trim() ?? null,
    url_midia: url_midia?.trim() ?? null,
    assinado_em: ori.assinado_em,
  })

  const { data: atualizadas, error } = await supabase.from('orientacoes').update({
    titulo: titulo.trim(),
    tipo: tipoFinal,
    url_midia: url_midia?.trim() || null,
    conteudo: conteudo?.trim() || null,
    hash_integridade: hash,
  }).eq('id', id).select('id')

  if (error) return NextResponse.json({ error: 'Erro ao atualizar orientação.' }, { status: 500 })
  if (!atualizadas || atualizadas.length === 0) {
    return NextResponse.json({ error: 'Não foi possível salvar as alterações desta orientação.' }, { status: 403 })
  }

  return NextResponse.json({ success: true })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const ori = await carregarOrientacao(supabase, id)
  if (!ori) return NextResponse.json({ error: 'Orientação não encontrada' }, { status: 404 })
  if (ori.terapeuta_id !== user.id) {
    return NextResponse.json({ error: 'Só quem escreveu a orientação pode excluí-la.' }, { status: 403 })
  }
  if (ori.statusPaciente !== 'ativo') {
    return NextResponse.json({ error: ERRO_ENCERRADO }, { status: 409 })
  }

  // O trigger `audit_orientacoes` grava `excluiu` em audit_logs com a autora e a data.
  const { data: apagadas, error } = await supabase.from('orientacoes').delete().eq('id', id).select('id')

  if (error) return NextResponse.json({ error: 'Erro ao excluir orientação.' }, { status: 500 })
  if (!apagadas || apagadas.length === 0) {
    return NextResponse.json({ error: 'Não foi possível excluir esta orientação.' }, { status: 403 })
  }

  return NextResponse.json({ success: true })
}
