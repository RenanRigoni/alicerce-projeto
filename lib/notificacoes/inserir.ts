import { createAdminClient } from '@/lib/supabase/admin'

interface Notificacao {
  destinatario_id: string
  tipo: string
  titulo: string
  mensagem?: string
  link?: string
}

export async function inserirNotificacao(n: Notificacao) {
  const { error } = await createAdminClient().from('notificacoes').insert(n)
  if (error) console.error('[notificacoes] insert error:', error)
}

export async function inserirNotificacoes(ns: Notificacao[]) {
  if (ns.length === 0) return
  const { error } = await createAdminClient().from('notificacoes').insert(ns)
  if (error) console.error('[notificacoes] batch insert error:', error)
}

export async function notificarAdmins(tipo: string, titulo: string, mensagem?: string, link?: string) {
  const db = createAdminClient()
  const { data: admins, error } = await db.from('profiles').select('id').eq('role', 'admin')
  if (error) { console.error('[notificacoes] notificarAdmins query error:', error); return }
  if (!admins?.length) { console.warn('[notificacoes] notificarAdmins: no admins found'); return }
  await inserirNotificacoes(
    admins.map(a => ({ destinatario_id: a.id, tipo, titulo, mensagem, link }))
  )
}

export async function notificarTerapeutasDoPaciente(
  pacienteId: string,
  tipo: string,
  titulo: string,
  mensagem?: string,
  link?: string
) {
  const db = createAdminClient()
  const { data: vinculos, error } = await db
    .from('paciente_terapeutas')
    .select('terapeuta_id')
    .eq('paciente_id', pacienteId)
  if (error) { console.error('[notificacoes] notificarTerapeutas query error:', error); return }
  if (!vinculos?.length) return
  await inserirNotificacoes(
    vinculos.map(v => ({ destinatario_id: v.terapeuta_id, tipo, titulo, mensagem, link }))
  )
}

export async function notificarResponsaveisDoPaciente(
  pacienteId: string,
  tipo: string,
  titulo: string,
  mensagem?: string,
  link?: string
) {
  const db = createAdminClient()
  const { data: vinculos, error } = await db
    .from('paciente_responsaveis')
    .select('responsavel_id')
    .eq('paciente_id', pacienteId)
  if (error) { console.error('[notificacoes] notificarResponsaveis query error:', error); return }
  if (!vinculos?.length) { console.warn('[notificacoes] notificarResponsaveis: no responsaveis for paciente', pacienteId); return }
  await inserirNotificacoes(
    vinculos.map(v => ({ destinatario_id: v.responsavel_id, tipo, titulo, mensagem, link }))
  )
}
