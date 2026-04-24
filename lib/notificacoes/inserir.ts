import { createClient } from '@supabase/supabase-js'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

interface Notificacao {
  destinatario_id: string
  tipo: string
  titulo: string
  mensagem?: string
  link?: string
}

export async function inserirNotificacao(n: Notificacao) {
  await adminClient().from('notificacoes').insert(n)
}

export async function inserirNotificacoes(ns: Notificacao[]) {
  if (ns.length === 0) return
  await adminClient().from('notificacoes').insert(ns)
}

export async function notificarAdmins(tipo: string, titulo: string, mensagem?: string, link?: string) {
  const db = adminClient()
  const { data: admins } = await db.from('profiles').select('id').eq('role', 'admin')
  if (!admins?.length) return
  await inserirNotificacoes(
    admins.map(a => ({ destinatario_id: a.id, tipo, titulo, mensagem, link }))
  )
}

export async function notificarResponsaveisDoPaciente(
  pacienteId: string,
  tipo: string,
  titulo: string,
  mensagem?: string,
  link?: string
) {
  const db = adminClient()
  const { data: vinculos } = await db
    .from('paciente_responsaveis')
    .select('responsavel_id')
    .eq('paciente_id', pacienteId)
  if (!vinculos?.length) return
  await inserirNotificacoes(
    vinculos.map(v => ({ destinatario_id: v.responsavel_id, tipo, titulo, mensagem, link }))
  )
}
