import { mascaraTelefone } from '@/lib/masks'
import { formatarCrm } from '@/lib/paciente/encaminhamentos'

/**
 * Busca de texto DENTRO do prontuário de um paciente já aberto. É só filtro de exibição
 * sobre o que a página já carregou: nada daqui vai ao servidor, é gravado ou logado, porque
 * o termo digitado é texto clínico.
 */

type Texto = string | null | undefined

/** Sem acento e sem diferença de maiúscula: "Avaliação" e "avaliacao" são a mesma busca. */
export function normalizarBusca(texto: string): string {
  return texto.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/\s+/g, ' ').trim()
}

/** "atraso fala" vira ['atraso', 'fala']: o item precisa conter todos os termos, em qualquer ordem. */
export function termosDaBusca(busca: string): string[] {
  const normalizada = normalizarBusca(busca)
  return normalizada ? normalizada.split(' ') : []
}

/** Sem termos, tudo casa (o filtro fica desligado). */
export function casaComBusca(termos: string[], campos: Texto[]): boolean {
  if (termos.length === 0) return true
  // '\n' separa os campos: um termo nunca casa atravessando o fim de um e o começo de outro.
  const palheiro = campos.filter((c): c is string => !!c).map(normalizarBusca).join('\n')
  return termos.every(termo => palheiro.includes(termo))
}

export function filtrarPorBusca<T>(itens: T[], termos: string[], camposDe: (item: T) => Texto[]): T[] {
  if (termos.length === 0) return itens
  return itens.filter(item => casaComBusca(termos, camposDe(item)))
}

// ── Campos de texto de cada tipo de item ─────────────────────────────────────
// Todas as colunas de texto que o formulário pode gravar, não só as que hoje têm dado:
// obs_clinicas, testes e resultado_discussao estão vazias em produção e, sem elas aqui, a
// busca passaria a mentir em silêncio no dia em que a equipe começar a preenchê-las.

export interface TextoDeEvolucaoOuRelatorio {
  identificacao: Texto
  obs_clinicas?: Texto
  testes?: Texto
  resultado_discussao?: Texto
  conclusao: Texto
}

export function camposDeEvolucaoOuRelatorio(item: TextoDeEvolucaoOuRelatorio): Texto[] {
  return [item.identificacao, item.obs_clinicas, item.testes, item.resultado_discussao, item.conclusao]
}

export interface TextoDeOrientacao {
  titulo: Texto
  conteudo: Texto
}

export function camposDeOrientacao(item: TextoDeOrientacao): Texto[] {
  return [item.titulo, item.conteudo]
}

export interface TextoDeEncaminhamento {
  medico_nome: Texto
  medico_crm: Texto
  medico_crm_uf: Texto
  medico_telefone: Texto
  especialidade: Texto
  motivo: Texto
  observacoes: Texto
}

export function camposDeEncaminhamento(item: TextoDeEncaminhamento): Texto[] {
  return [
    item.medico_nome,
    item.medico_crm,
    formatarCrm(item.medico_crm ?? null, item.medico_crm_uf ?? null), // "12345/MG"
    item.medico_telefone,
    item.medico_telefone ? mascaraTelefone(item.medico_telefone) : null, // "(34) 3333-4444", como aparece na tela
    item.especialidade,
    item.motivo,
    item.observacoes,
  ]
}

// ── Quantos casaram e em qual aba ────────────────────────────────────────────

export type AbaDoResultado = 'Relatórios' | 'Evolução' | 'Orientações' | 'Dados Clínicos'

export interface ContagensDaBusca {
  relatorios: number
  evolucoes: number
  orientacoes: number
  encaminhamentos: number
}

export interface ResumoDaBusca {
  total: number
  porAba: Array<{ aba: AbaDoResultado; n: number; rotulo: string }>
}

const plural = (n: number, singular: string, plural: string) => `${n} ${n === 1 ? singular : plural}`

/** Só lista as abas com resultado; o total soma tudo. Encaminhamentos moram na aba Dados Clínicos. */
export function resumirBusca(c: ContagensDaBusca): ResumoDaBusca {
  const porAba: ResumoDaBusca['porAba'] = [
    { aba: 'Relatórios' as const, n: c.relatorios, rotulo: plural(c.relatorios, 'relatório', 'relatórios') },
    { aba: 'Evolução' as const, n: c.evolucoes, rotulo: plural(c.evolucoes, 'evolução', 'evoluções') },
    { aba: 'Orientações' as const, n: c.orientacoes, rotulo: plural(c.orientacoes, 'orientação', 'orientações') },
    { aba: 'Dados Clínicos' as const, n: c.encaminhamentos, rotulo: plural(c.encaminhamentos, 'encaminhamento', 'encaminhamentos') },
  ].filter(a => a.n > 0)
  return { total: porAba.reduce((soma, a) => soma + a.n, 0), porAba }
}
