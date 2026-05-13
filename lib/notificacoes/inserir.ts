import { createAdminClient } from '@/lib/supabase/admin'
import { sendPushToUsers } from '@/lib/notificacoes/push'

interface Notificacao {
  destinatario_id: string
  tipo: string
  titulo: string
  mensagem?: string
  link?: string
  notification_type?: 'individual' | 'global' | 'role_based'
  target_user_id?: string
  target_role?: 'admin' | 'recepcao' | 'terapeuta' | 'pai'
  related_patient_id?: string
  related_entity_type?: 'relatorio' | 'evolucao' | 'orientacao' | 'comunicado' | 'feriado' | 'agenda' | 'alta' | 'documento' | 'outro'
  related_entity_id?: string
}

type Role = 'admin' | 'recepcao' | 'terapeuta' | 'pai'
type RelatedEntityType = NonNullable<Notificacao['related_entity_type']>

interface NotificacaoContexto {
  related_patient_id?: string
  related_entity_type?: RelatedEntityType
  related_entity_id?: string
  notification_type?: 'individual' | 'global' | 'role_based'
  target_role?: Role
}

function inferRelatedEntityType(tipo: string): RelatedEntityType {
  if (tipo.includes('relatorio')) return 'relatorio'
  if (tipo.includes('evolucao')) return 'evolucao'
  if (tipo.includes('orientacao')) return 'orientacao'
  if (tipo.includes('comunicado')) return 'comunicado'
  if (tipo.includes('feriado')) return 'feriado'
  if (tipo.includes('agenda') || tipo.includes('agendamento')) return 'agenda'
  if (tipo.includes('alta')) return 'alta'
  if (tipo.includes('documento')) return 'documento'
  return 'outro'
}

function normalizarNotificacao(n: Notificacao) {
  return {
    ...n,
    target_user_id: n.target_user_id ?? n.destinatario_id,
    notification_type: n.notification_type ?? 'individual',
    related_entity_type: n.related_entity_type ?? inferRelatedEntityType(n.tipo),
  }
}

export async function inserirNotificacao(n: Notificacao) {
  const db = createAdminClient()
  const { data, error } = await db
    .from('notificacoes')
    .insert(normalizarNotificacao(n))
    .select('id, destinatario_id, titulo, mensagem, link')
    .single()
  if (error) console.error('[notificacoes] insert error:', error)
  if (!data) return

  const pushResult = await sendPushToUsers([data.destinatario_id], {
    title: data.titulo,
    body: data.mensagem,
    url: data.link,
    notificationId: data.id,
  })

  await db
    .from('notificacoes')
    .update({ sent_at: pushResult.sentAt, send_error: pushResult.error })
    .eq('id', data.id)
}

export async function inserirNotificacoes(ns: Notificacao[]) {
  if (ns.length === 0) return
  const db = createAdminClient()
  const { data, error } = await db
    .from('notificacoes')
    .insert(ns.map(normalizarNotificacao))
    .select('id, destinatario_id, titulo, mensagem, link')
  if (error) console.error('[notificacoes] batch insert error:', error)
  if (!data?.length) return

  await Promise.all(data.map(async (n) => {
    const pushResult = await sendPushToUsers([n.destinatario_id], {
      title: n.titulo,
      body: n.mensagem,
      url: n.link,
      notificationId: n.id,
    })

    await db
      .from('notificacoes')
      .update({ sent_at: pushResult.sentAt, send_error: pushResult.error })
      .eq('id', n.id)
  }))
}

export async function notificarAdmins(tipo: string, titulo: string, mensagem?: string, link?: string) {
  const db = createAdminClient()
  const { data: admins, error } = await db.from('profiles').select('id').eq('role', 'admin').eq('ativo', true)
  if (error) { console.error('[notificacoes] notificarAdmins query error:', error); return }
  if (!admins?.length) { console.warn('[notificacoes] notificarAdmins: no admins found'); return }
  await inserirNotificacoes(
    admins.map(a => ({
      destinatario_id: a.id,
      tipo,
      titulo,
      mensagem,
      link,
      notification_type: 'role_based',
      target_role: 'admin',
      related_entity_type: inferRelatedEntityType(tipo),
    }))
  )
}

export async function notificarTerapeutasDoPaciente(
  pacienteId: string,
  tipo: string,
  titulo: string,
  mensagem?: string,
  link?: string,
  contexto?: NotificacaoContexto
) {
  const db = createAdminClient()
  const { data: vinculos, error } = await db
    .from('paciente_terapeutas')
    .select('terapeuta_id')
    .eq('paciente_id', pacienteId)
  if (error) { console.error('[notificacoes] notificarTerapeutas query error:', error); return }
  if (!vinculos?.length) return
  await inserirNotificacoes(
    vinculos.map(v => ({
      destinatario_id: v.terapeuta_id,
      tipo,
      titulo,
      mensagem,
      link,
      notification_type: contexto?.notification_type ?? 'individual',
      target_user_id: contexto?.notification_type === 'role_based' ? undefined : v.terapeuta_id,
      target_role: contexto?.target_role,
      related_patient_id: contexto?.related_patient_id ?? pacienteId,
      related_entity_type: contexto?.related_entity_type ?? inferRelatedEntityType(tipo),
      related_entity_id: contexto?.related_entity_id,
    }))
  )
}

export async function notificarResponsaveisDoPaciente(
  pacienteId: string,
  tipo: string,
  titulo: string,
  mensagem?: string,
  link?: string,
  contexto?: NotificacaoContexto
) {
  const db = createAdminClient()
  const { data: vinculos, error } = await db
    .from('paciente_responsaveis')
    .select('responsavel_id')
    .eq('paciente_id', pacienteId)
  if (error) { console.error('[notificacoes] notificarResponsaveis query error:', error); return }
  if (!vinculos?.length) { console.warn('[notificacoes] notificarResponsaveis: no responsaveis for paciente', pacienteId); return }
  await inserirNotificacoes(
    vinculos.map(v => ({
      destinatario_id: v.responsavel_id,
      tipo,
      titulo,
      mensagem,
      link,
      notification_type: 'individual',
      target_user_id: v.responsavel_id,
      related_patient_id: contexto?.related_patient_id ?? pacienteId,
      related_entity_type: contexto?.related_entity_type ?? inferRelatedEntityType(tipo),
      related_entity_id: contexto?.related_entity_id,
    }))
  )
}

export async function notificarPorPerfil(
  role: Role,
  tipo: string,
  titulo: string,
  mensagem?: string,
  link?: string,
  contexto?: NotificacaoContexto
) {
  const db = createAdminClient()
  const { data: usuarios, error } = await db
    .from('profiles')
    .select('id')
    .eq('role', role)
    .eq('ativo', true)

  if (error) { console.error('[notificacoes] notificarPorPerfil query error:', error); return }
  if (!usuarios?.length) return

  await inserirNotificacoes(
    usuarios.map(u => ({
      destinatario_id: u.id,
      tipo,
      titulo,
      mensagem,
      link,
      notification_type: 'role_based',
      target_role: role,
      related_patient_id: contexto?.related_patient_id,
      related_entity_type: contexto?.related_entity_type ?? inferRelatedEntityType(tipo),
      related_entity_id: contexto?.related_entity_id,
    }))
  )
}

export async function notificarTodos(
  tipo: string,
  titulo: string,
  mensagem?: string,
  link?: string,
  contexto?: NotificacaoContexto
) {
  const db = createAdminClient()
  const { data: usuarios, error } = await db
    .from('profiles')
    .select('id')
    .eq('ativo', true)

  if (error) { console.error('[notificacoes] notificarTodos query error:', error); return }
  if (!usuarios?.length) return

  await inserirNotificacoes(
    usuarios.map(u => ({
      destinatario_id: u.id,
      tipo,
      titulo,
      mensagem,
      link,
      notification_type: 'global',
      related_patient_id: contexto?.related_patient_id,
      related_entity_type: contexto?.related_entity_type ?? inferRelatedEntityType(tipo),
      related_entity_id: contexto?.related_entity_id,
    }))
  )
}
