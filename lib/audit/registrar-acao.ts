import { createClient } from '@/lib/supabase/server'

export async function registrarAcao(
  acao: 'visualizou' | 'enviou' | 'alterou' | 'assinou' | 'baixou',
  recursoTipo: string,
  recursoId: string
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from('audit_logs').insert({
      usuario_id: user.id,
      acao,
      recurso_tipo: recursoTipo,
      recurso_id: recursoId,
    })
  } catch {
    // Auditoria nunca deve quebrar o fluxo principal
  }
}
