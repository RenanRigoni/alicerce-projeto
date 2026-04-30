// SHA-256 determinístico — funciona em browser (Web Crypto) e Node/Edge (crypto global).
// Chaves ordenadas para garantir mesmo hash independente da ordem de inserção.
export async function gerarHash(dados: Record<string, unknown>): Promise<string> {
  const texto = JSON.stringify(dados, Object.keys(dados).sort())
  const encoder = new TextEncoder()
  const buffer = await crypto.subtle.digest('SHA-256', encoder.encode(texto))
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}
