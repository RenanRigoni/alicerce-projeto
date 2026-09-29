'use server'

import { aplicarResposta, type AcaoSessao, type TipoResultado } from '@/lib/sessao/confirmacao'

/**
 * Grava a resposta do responsável. Só roda via POST do formulário — abrir o
 * link não altera nada, então pré-visualização de link não responde sozinha.
 *
 * `token` e `acao` chegam por bind no servidor, não pelo formulário.
 */
export async function responderSessao(
  token: string,
  acao: AcaoSessao,
  _anterior: TipoResultado | null,
  _formData: FormData,
): Promise<TipoResultado> {
  const { resultado } = await aplicarResposta(token, acao)
  return resultado
}
