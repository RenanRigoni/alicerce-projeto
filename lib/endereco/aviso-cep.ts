import { validarCep } from './cep'
import type { ResultadoCep } from './via-cep'

/** erro impede salvar; aviso informa e deixa salvar (a consulta externa nunca trava o cadastro). */
export interface AvisoCep {
  tipo: 'erro' | 'aviso'
  mensagem: string
}

export function avisoDeValidacao(valor: string | null | undefined): AvisoCep | null {
  const validacao = validarCep(valor)
  return validacao.valido ? null : { tipo: 'erro', mensagem: validacao.mensagem }
}

export function avisoDoResultado(resultado: ResultadoCep): AvisoCep | null {
  if (resultado.ok) return null
  if (resultado.motivo === 'nao_encontrado') {
    return {
      tipo: 'aviso',
      mensagem: 'CEP não encontrado. Confira os números; se estiver certo, preencha o endereço à mão e salve normalmente.',
    }
  }
  if (resultado.motivo === 'falha_consulta') {
    return {
      tipo: 'aviso',
      mensagem: 'Não foi possível consultar o CEP agora. Preencha o endereço à mão e salve normalmente.',
    }
  }
  return { tipo: 'erro', mensagem: 'CEP incompleto — o CEP tem 8 números.' }
}
