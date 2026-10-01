// Payload da ficha de dados clínicos. Fica aqui, puro, por causa de um bug que deixou a ficha
// inteira inútil: a tela mandava `hash_integridade`, coluna que `pacientes_dados_clinicos` não
// tem, e o PostgREST recusava TODO salvamento com 400 PGRST204 ("Could not find the
// 'hash_integridade' column of 'pacientes_dados_clinicos' in the schema cache"). O erro nem
// chegava ao banco, então nada no SQL denunciava: a tabela só ficava com 0 linhas.
// `COLUNAS_DADOS_CLINICOS` espelha a tabela em produção e test:dados-clinicos confere que o
// payload não inventa coluna nenhuma.

/** Exatamente as colunas de public.pacientes_dados_clinicos. */
export const COLUNAS_DADOS_CLINICOS = [
  'paciente_id',
  'hipotese_diagnostica',
  'diagnostico',
  'objetivos_terapeuticos',
  'plano_terapeutico',
  'demandas_prioritarias',
  'data_avaliacao_inicial',
  'obs_clinicas_gerais',
  'estrategias_utilizadas',
  'orientacoes_para_casa',
  'evolucao_resumida',
  'metas_curto_prazo',
  'metas_medio_prazo',
  'sensibilidades_restricoes',
  'nivel_suporte',
  'obs_comportamento_regulacao',
  'informacoes_escolares',
  'pontos_atencao_equipe',
  'atualizado_em',
  'atualizado_por',
] as const

export type ColunaDadosClinicos = typeof COLUNAS_DADOS_CLINICOS[number]

/** Campos preenchidos pela terapeuta: tudo menos a chave e a marca de quem salvou. */
export type CamposDadosClinicos = Partial<
  Record<Exclude<ColunaDadosClinicos, 'paciente_id' | 'atualizado_em' | 'atualizado_por'>, string | null>
>

export interface ContextoSalvamentoDadosClinicos {
  pacienteId: string
  /** ISO. Vem de quem chama para a tela mostrar o mesmo instante que gravou. */
  agora: string
  usuarioId: string | undefined
}

/**
 * Linha a mandar no upsert (`onConflict: 'paciente_id'`). Nenhuma chave fora de
 * `COLUNAS_DADOS_CLINICOS`: uma chave a mais derruba o salvamento inteiro, não só o campo.
 */
export function montarPayloadDadosClinicos(
  campos: CamposDadosClinicos,
  { pacienteId, agora, usuarioId }: ContextoSalvamentoDadosClinicos,
): Record<string, unknown> {
  return {
    ...campos,
    paciente_id: pacienteId,
    atualizado_em: agora,
    atualizado_por: usuarioId,
  }
}

/** Chaves que a tabela não tem. Vazio = o upsert passa pelo PostgREST. */
export function colunasDesconhecidas(payload: Record<string, unknown>): string[] {
  const conhecidas = new Set<string>(COLUNAS_DADOS_CLINICOS)
  return Object.keys(payload).filter(k => !conhecidas.has(k))
}
