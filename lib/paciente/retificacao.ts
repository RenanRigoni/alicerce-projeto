// Retificação de evolução: correção por ACRÉSCIMO, nunca por alteração.
//
// A norma brasileira de prontuário eletrônico (certificação CFM/SBIS) exige que o sistema impeça
// modificar o que foi escrito e salvo após o atendimento — informação pode ser ACRESCENTADA, não
// alterada. Então corrigir uma evolução publicada é criar outra evolução que aponta para ela
// (`retifica_id`). As duas ficam no prontuário, cada uma com sua autora, data, assinatura e hash.
//
// Nenhuma coluna marca a original como "retificada": isso se deduz de existir uma linha
// apontando para ela, e é o que `indexarRetificacoes` faz. Uma informação, um lugar.
//
// Tudo aqui é puro para a tela da profissional e o portal da família mostrarem a mesma coisa.

/** O mínimo que uma evolução precisa expor para o vínculo de retificação ser montado. */
export interface EvolucaoRetificavel {
  id: string
  retifica_id?: string | null
  criado_em: string
  identificacao?: string | null
  status?: string | null
}

export interface VinculoRetificacao {
  /** Esta evolução retifica outra: o rótulo diz qual. */
  retifica: { id: string; rotulo: string } | null
  /** Outra(s) evolução(ões) retificam esta: ela deixou de ser a versão corrente. */
  retificadaPor: Array<{ id: string; rotulo: string }>
}

const dataCurta = (iso: string) => {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('pt-BR')
}

/** "Retificação da evolução de 01/10/2026" — e sem data utilizável, só "evolução anterior". */
export function rotuloDaOriginal(original: EvolucaoRetificavel): string {
  const data = dataCurta(original.criado_em)
  return data ? `evolução de ${data}` : 'evolução anterior'
}

/**
 * Para cada evolução, o que ela retifica e por quem foi retificada. Uma passada, sem N+1, e
 * tolerante a `retifica_id` apontando para fora da lista (busca filtrada, paginação): o elo que
 * não está na lista simplesmente não gera rótulo, em vez de quebrar a tela.
 */
export function indexarRetificacoes(
  evolucoes: readonly EvolucaoRetificavel[],
): Map<string, VinculoRetificacao> {
  const porId = new Map(evolucoes.map(e => [e.id, e]))
  const indice = new Map<string, VinculoRetificacao>(
    evolucoes.map(e => [e.id, { retifica: null, retificadaPor: [] }]),
  )

  for (const evo of evolucoes) {
    if (!evo.retifica_id) continue
    const original = porId.get(evo.retifica_id)
    if (!original) continue

    indice.get(evo.id)!.retifica = { id: original.id, rotulo: rotuloDaOriginal(original) }
    indice.get(original.id)!.retificadaPor.push({ id: evo.id, rotulo: rotuloDaOriginal(evo) })
  }

  return indice
}

/**
 * Só evolução PUBLICADA se retifica. Rascunho ainda é editável pela autora, então corrigir é
 * editar — criar retificação de rascunho encheria o prontuário sem motivo.
 */
export function podeRetificar(evolucao: EvolucaoRetificavel): boolean {
  return evolucao.status === 'publicado'
}

/** Título sugerido para a evolução de retificação, a partir da original. */
export function tituloSugeridoDaRetificacao(original: EvolucaoRetificavel): string {
  const base = (original.identificacao ?? '').trim()
  const data = dataCurta(original.criado_em)
  const alvo = data ? `evolução de ${data}` : 'evolução anterior'
  return base ? `Retificação — ${base}` : `Retificação da ${alvo}`
}
