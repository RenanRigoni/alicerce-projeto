export const TAMANHO_CEP = 8

/** A máscara para de aceitar dígitos aqui, depois de já ter passado de 8, para o erro aparecer em vez de sumir. */
const LIMITE_DIGITOS_MASCARA = 10

export type ValidacaoCep =
  | { valido: true; /** 8 dígitos sem hífen, ou null quando o campo está vazio (CEP é opcional). */ cep: string | null }
  | { valido: false; motivo: 'incompleto' | 'excedente' | 'sem_digitos'; mensagem: string }

// Rotas recebem JSON: o valor pode chegar como número ou objeto, não só string.
export function somenteDigitosCep(valor: unknown): string {
  return String(valor ?? '').replace(/\D/g, '')
}

/**
 * CEP vazio é válido: o campo é opcional. Com qualquer dígito, exige exatamente 8.
 * É a mesma regra na tela e nas rotas; a tela só antecipa o que o servidor recusaria.
 */
export function validarCep(valor: unknown): ValidacaoCep {
  const texto = String(valor ?? '').trim()
  if (!texto) return { valido: true, cep: null }

  const digitos = somenteDigitosCep(texto)
  if (digitos.length === 0) {
    return { valido: false, motivo: 'sem_digitos', mensagem: 'CEP inválido — use apenas números (8 dígitos).' }
  }
  if (digitos.length < TAMANHO_CEP) {
    const faltam = TAMANHO_CEP - digitos.length
    return {
      valido: false,
      motivo: 'incompleto',
      mensagem: `CEP incompleto — faltam ${faltam} ${faltam === 1 ? 'dígito' : 'dígitos'}.`,
    }
  }
  if (digitos.length > TAMANHO_CEP) {
    const sobram = digitos.length - TAMANHO_CEP
    return {
      valido: false,
      motivo: 'excedente',
      mensagem: `CEP com ${sobram} ${sobram === 1 ? 'dígito' : 'dígitos'} a mais — o CEP tem 8 números.`,
    }
  }
  return { valido: true, cep: digitos }
}

/** Valor a gravar no banco: 8 dígitos sem hífen. Devolve null para vazio E para inválido; valide antes com validarCep. */
export function normalizarCep(valor: unknown): string | null {
  const resultado = validarCep(valor)
  return resultado.valido ? resultado.cep : null
}

/**
 * 00000-000 enquanto digita. O hífen é fixo: aparece assim que há 5 dígitos ("38742-"), então
 * digitá-lo é inofensivo e não digitá-lo dá no mesmo. Campo sem dígitos continua vazio.
 *
 * Não corta em 8: colar 9 dígitos precisa acusar erro, não virar outro CEP em silêncio.
 *
 * `apagando`: a mudança veio de uma tecla de apagar. Aí o hífen só fica se ainda estiver no
 * campo; senão, apagar o hífen de "38742-" o recolocaria e a pessoa nunca mais apagaria o
 * 5º dígito. Quem semeia estado inicial com o valor gravado não passa a opção.
 */
export function mascaraCep(valor: string, opcoes: { apagando?: boolean } = {}): string {
  const digitos = somenteDigitosCep(valor).slice(0, LIMITE_DIGITOS_MASCARA)
  if (digitos.length > 5) return `${digitos.slice(0, 5)}-${digitos.slice(5)}`
  if (digitos.length === 5 && (!opcoes.apagando || valor.includes('-'))) return `${digitos}-`
  return digitos
}

/** Para o onChange do campo de CEP: detecta apagamento (`inputType` "delete...") e aplica a máscara. */
export function mascaraCepDoEvento(evento: { target: { value: string }; nativeEvent: Event }): string {
  const tipo = (evento.nativeEvent as Partial<InputEvent>).inputType
  return mascaraCep(evento.target.value, { apagando: typeof tipo === 'string' && tipo.startsWith('delete') })
}
