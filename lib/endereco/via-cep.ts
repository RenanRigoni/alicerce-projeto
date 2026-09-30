import { TAMANHO_CEP, somenteDigitosCep } from './cep'

export interface EnderecoViaCep {
  logradouro: string
  localidade: string
  bairro: string
  uf: string
}

/**
 * Os três motivos exigem mensagens diferentes na tela: incompleto é erro do
 * usuário, nao_encontrado pode ser loteamento novo, falha_consulta é o ViaCEP
 * fora do ar. Devolver só null impedia a tela de distinguir.
 */
export type ResultadoCep =
  | { ok: true; endereco: EnderecoViaCep }
  | { ok: false; motivo: 'incompleto' | 'nao_encontrado' | 'falha_consulta' }

const TEMPO_LIMITE_CONSULTA_MS = 6000

export async function buscarCep(cep: string): Promise<ResultadoCep> {
  const digitos = somenteDigitosCep(cep)
  if (digitos.length !== TAMANHO_CEP) return { ok: false, motivo: 'incompleto' }

  const controlador = new AbortController()
  const timer = setTimeout(() => controlador.abort(), TEMPO_LIMITE_CONSULTA_MS)

  try {
    const res = await fetch(`https://viacep.com.br/ws/${digitos}/json/`, { signal: controlador.signal })
    if (!res.ok) return { ok: false, motivo: 'falha_consulta' }

    const dados = await res.json()
    if (dados.erro) return { ok: false, motivo: 'nao_encontrado' }

    return {
      ok: true,
      endereco: {
        logradouro: dados.logradouro ?? '',
        localidade: dados.localidade ?? '',
        bairro: dados.bairro ?? '',
        uf: dados.uf ?? '',
      },
    }
  } catch {
    return { ok: false, motivo: 'falha_consulta' }
  } finally {
    clearTimeout(timer)
  }
}
