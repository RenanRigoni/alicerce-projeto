import { createAdminClient } from '@/lib/supabase/admin'
import { notificarSessaoCancelada, notificarSessaoReativada } from '@/lib/notificacoes/sessao-cancelada'

export type AcaoSessao = 'confirmar' | 'cancelar'

export type TipoResultado =
  | 'confirmado'
  | 'ja_confirmado'
  | 'ja_cancelado'
  | 'cancelado'
  | 'expirado'
  | 'nao_encontrado'

export interface DadosSessao {
  paciente: string
  data: string
  hora: string
}

export type EstadoLink =
  | { tipo: 'pergunta'; sessao: DadosSessao }
  | { tipo: 'resultado'; resultado: TipoResultado; sessao?: DadosSessao }

const STATUS_ANTERIORES: Record<AcaoSessao, string[]> = {
  // O responsável pode trocar de ideia enquanto o prazo estiver aberto
  cancelar: ['pendente', 'confirmada'],
  confirmar: ['pendente', 'cancelada'],
}

export function formatarDataHora(iso: string): { data: string; hora: string } {
  const dt = new Date(iso)
  return {
    data: dt.toLocaleDateString('pt-BR', {
      weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
      timeZone: 'America/Sao_Paulo',
    }),
    hora: dt.toLocaleTimeString('pt-BR', {
      hour: '2-digit', minute: '2-digit',
      timeZone: 'America/Sao_Paulo',
    }),
  }
}

type Db = ReturnType<typeof createAdminClient>

async function descreverSessao(db: Db, pacienteId: string, dataHora: string): Promise<DadosSessao> {
  const { data: pac } = await db.from('pacientes').select('nome').eq('id', pacienteId).maybeSingle()
  return { paciente: pac?.nome ?? 'Paciente', ...formatarDataHora(dataHora) }
}

/**
 * Só uma resposta ainda pendente vira "expirada". Se o responsável já respondeu
 * dentro do prazo, a resposta dele vale — expirar por cima transformaria um
 * cancelamento feito a tempo em sessão cobrada.
 */
async function expirarSePendente(db: Db, token: string) {
  await db
    .from('sessao_confirmacoes')
    .update({ status: 'expirada' })
    .eq('token', token)
    .eq('status', 'pendente')
}

function jaRespondido(status: string): TipoResultado | null {
  if (status === 'cancelada') return 'ja_cancelado'
  if (status === 'confirmada') return 'ja_confirmado'
  return null
}

/** O que a página deve mostrar ao abrir o link, sem gravar a resposta. */
export async function lerEstadoLink(token: string, acao: AcaoSessao): Promise<EstadoLink> {
  const db = createAdminClient()

  const { data: conf } = await db
    .from('sessao_confirmacoes')
    .select('paciente_id, data_hora, status, expira_em')
    .eq('token', token)
    .maybeSingle()

  if (!conf) return { tipo: 'resultado', resultado: 'nao_encontrado' }

  const sessao = await descreverSessao(db, conf.paciente_id as string, conf.data_hora as string)
  const status = conf.status as string

  // Já está no estado que este link pretendia: nada a perguntar
  if (acao === 'cancelar' && status === 'cancelada') return { tipo: 'resultado', resultado: 'ja_cancelado', sessao }
  if (acao === 'confirmar' && status === 'confirmada') return { tipo: 'resultado', resultado: 'ja_confirmado', sessao }

  const prazoAcabou = new Date(conf.expira_em as string) <= new Date() || status === 'expirada'
  if (prazoAcabou) {
    const respondido = jaRespondido(status)
    if (respondido) return { tipo: 'resultado', resultado: respondido, sessao }
    await expirarSePendente(db, token)
    return { tipo: 'resultado', resultado: 'expirado', sessao }
  }

  return { tipo: 'pergunta', sessao }
}

/** Grava a resposta do responsável. Chamada apenas por POST, nunca ao abrir o link. */
export async function aplicarResposta(
  token: string,
  acao: AcaoSessao,
): Promise<{ resultado: TipoResultado; sessao?: DadosSessao }> {
  const db = createAdminClient()

  const { data: conf } = await db
    .from('sessao_confirmacoes')
    .select('paciente_id, data_hora, status, expira_em')
    .eq('token', token)
    .maybeSingle()

  if (!conf) return { resultado: 'nao_encontrado' }

  const sessao = await descreverSessao(db, conf.paciente_id as string, conf.data_hora as string)
  const statusAnterior = conf.status as string

  // Revalida o prazo na hora de gravar: a página pode ter ficado aberta
  const prazoAcabou = new Date(conf.expira_em as string) <= new Date() || statusAnterior === 'expirada'
  if (prazoAcabou) {
    const respondido = jaRespondido(statusAnterior)
    if (respondido) return { resultado: respondido, sessao }
    await expirarSePendente(db, token)
    return { resultado: 'expirado', sessao }
  }

  const { data: updated } = await db
    .from('sessao_confirmacoes')
    .update({
      status: acao === 'cancelar' ? 'cancelada' : 'confirmada',
      respondido_em: new Date().toISOString(),
    })
    .eq('token', token)
    .in('status', STATUS_ANTERIORES[acao])
    .select('paciente_id, terapeuta_id, data_hora')
    .maybeSingle()

  // Nada mudou: outra aba já tinha gravado a mesma resposta
  if (!updated) {
    return { resultado: acao === 'cancelar' ? 'ja_cancelado' : 'ja_confirmado', sessao }
  }

  const alvo = {
    pacienteId: updated.paciente_id as string,
    terapeutaId: (updated.terapeuta_id as string | null) ?? null,
    dataHora: updated.data_hora as string,
  }

  if (acao === 'cancelar') {
    await notificarSessaoCancelada(alvo)
    return { resultado: 'cancelado', sessao }
  }

  // Confirmar depois de ter cancelado devolve o horário que a equipe já tinha liberado
  if (statusAnterior === 'cancelada') {
    await notificarSessaoReativada(alvo)
  }
  return { resultado: 'confirmado', sessao }
}
