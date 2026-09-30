export interface EnderecoResponsavel {
  endereco: string | null
  numero: string | null
  complemento: string | null
  bairro: string | null
  cidade: string | null
  estado: string | null
  cep: string | null
}

function limpar(valor: string | null | undefined): string {
  return (valor ?? '').trim()
}

/**
 * 8 dígitos viram 00000-000. O banco tem CEP digitado à mão, alguns
 * incompletos: nesses casos devolve o texto como está em vez de inventar dígito.
 */
export function formatarCep(cep: string | null | undefined): string {
  const texto = limpar(cep)
  const digitos = texto.replace(/\D/g, '')
  return digitos.length === 8 ? `${digitos.slice(0, 5)}-${digitos.slice(5)}` : texto
}

/**
 * Endereço em uma linha, no formato de correspondência:
 * "Rua das Flores, 123, Apto 4 - Centro - Uberlândia/MG - CEP 38400-000".
 * Devolve null quando não há nenhum dado, para a tela mostrar o estado vazio.
 */
export function formatarEndereco(e: EnderecoResponsavel): string | null {
  const rua = [limpar(e.endereco), limpar(e.numero), limpar(e.complemento)].filter(Boolean).join(', ')
  const cidade = limpar(e.cidade)
  const estado = limpar(e.estado)
  const cidadeUf = cidade && estado ? `${cidade}/${estado}` : cidade || estado
  const cep = limpar(e.cep) ? `CEP ${formatarCep(e.cep)}` : ''

  const partes = [rua, limpar(e.bairro), cidadeUf, cep].filter(Boolean)
  return partes.length > 0 ? partes.join(' - ') : null
}
