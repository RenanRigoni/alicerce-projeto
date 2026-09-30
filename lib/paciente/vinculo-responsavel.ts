import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * A terapeuta tem vínculo com o responsável quando ao menos um paciente DELA
 * também é paciente dele. Um responsável com dois filhos da mesma terapeuta
 * devolve duas linhas: por isso o `limit(1)` antes do `maybeSingle()`, que sozinho
 * exige exatamente uma e falha (PGRST116, data = null) quando vêm duas.
 *
 * Erro de consulta fecha o acesso (false), mas é registrado: sem isso um erro
 * como esse passava por "sem vínculo" sem ninguém perceber.
 */
export async function terapeutaTemVinculoComResponsavel(
  supabase: SupabaseClient,
  terapeutaId: string,
  responsavelId: string,
): Promise<boolean> {
  const { data: meusPacientes } = await supabase
    .from('paciente_terapeutas')
    .select('paciente_id')
    .eq('terapeuta_id', terapeutaId)

  const meusIds = (meusPacientes ?? []).map((p: { paciente_id: string }) => p.paciente_id)
  if (meusIds.length === 0) return false

  const { data: vinculo, error } = await supabase
    .from('paciente_responsaveis')
    .select('responsavel_id')
    .eq('responsavel_id', responsavelId)
    .in('paciente_id', meusIds)
    .limit(1)
    .maybeSingle()

  if (error) console.error('Falha ao checar vínculo terapeuta-responsável:', error.message)
  return !!vinculo
}
