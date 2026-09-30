export interface EnderecoViaCep {
  logradouro: string
  localidade: string
  bairro: string
  uf: string
}

export async function buscarCep(cep: string): Promise<EnderecoViaCep | null> {
  const digits = cep.replace(/\D/g, '')
  if (digits.length !== 8) return null
  try {
    const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`)
    const data = await res.json()
    if (data.erro) return null
    return {
      logradouro: data.logradouro ?? '',
      localidade: data.localidade ?? '',
      bairro: data.bairro ?? '',
      uf: data.uf ?? '',
    }
  } catch {
    return null
  }
}
