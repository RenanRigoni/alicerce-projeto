import { createAdminClient } from '@/lib/supabase/admin'
import { inserirNotificacoes } from '@/lib/notificacoes/inserir'

const TIPO = 'sessao_cancelada_responsavel'
const LINK_STAFF = '/admin/agendamentos'
const LINK_TERAPEUTA = '/terapia/agenda'

interface SessaoCancelada {
  pacienteId: string
  terapeutaId: string | null
  dataHora: string
}

function formatarQuando(iso: string) {
  const dt = new Date(iso)
  const dia = dt.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    timeZone: 'America/Sao_Paulo',
  })
  const hora = dt.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  })
  return `${dia.charAt(0).toUpperCase()}${dia.slice(1)} às ${hora}`
}

/**
 * Avisa a equipe quando o responsável cancela uma sessão pelo link de confirmação.
 * Terapeuta da sessão, admins e recepção recebem sino + push.
 *
 * Nunca lança: o cancelamento do responsável não pode falhar por causa do aviso.
 */
export async function notificarSessaoCancelada({ pacienteId, terapeutaId, dataHora }: SessaoCancelada) {
  try {
    const db = createAdminClient()

    const [{ data: paciente }, { data: staff }] = await Promise.all([
      db.from('pacientes').select('nome').eq('id', pacienteId).maybeSingle(),
      db.from('profiles').select('id').in('role', ['admin', 'recepcao']).eq('ativo', true),
    ])

    // Terapeuta primeiro: se ele também for staff, mantém o link da agenda dele
    const destinatarios = new Map<string, string>()
    if (terapeutaId) destinatarios.set(terapeutaId, LINK_TERAPEUTA)
    for (const s of staff ?? []) {
      if (!destinatarios.has(s.id)) destinatarios.set(s.id, LINK_STAFF)
    }
    if (destinatarios.size === 0) return

    const nome = paciente?.nome ?? 'Paciente'
    const quando = formatarQuando(dataHora)

    await inserirNotificacoes(
      [...destinatarios].map(([destinatarioId, link]) => ({
        destinatario_id: destinatarioId,
        tipo: TIPO,
        titulo: `Sessão cancelada — ${nome}`,
        mensagem: `${quando}. Cancelada pelo responsável. O horário ficou vago.`,
        link,
        notification_type: 'individual' as const,
        related_patient_id: pacienteId,
        related_entity_type: 'agenda' as const,
      })),
    )
  } catch (err) {
    console.error('[notificacoes] falha ao avisar cancelamento de sessão:', err)
  }
}
