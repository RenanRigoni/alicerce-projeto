import { validarCep } from '@/lib/endereco/cep'
import { classificarTelefone, somenteDigitosTelefone, type ClasseTelefone } from '@/lib/telefone'

// Qualidade dos dados de contato dos responsáveis. A regra de "telefone bom" mora em
// lib/telefone.ts e a de CEP em lib/endereco/cep.ts: este arquivo só as aplica. Painel e
// formulário nunca discordam porque não há segunda cópia da regra.

/** O telefone do responsável vive em dois lugares (profiles e responsaveis_detalhes): dívida registrada. */
export interface ContatoResponsavel {
  id: string
  telefone_perfil: string | null
  telefone_principal: string | null
  cep: string | null
}

/** Classes que não completam chamada ou estão fora do padrão; vazio e fixo válido não entram. */
const CLASSES_COM_PROBLEMA = new Set<ClasseTelefone>(['celular_sem_nono_digito', 'suspeito', 'tamanho_invalido'])

const MOTIVO_POR_CLASSE: Partial<Record<ClasseTelefone, string>> = {
  celular_sem_nono_digito: 'Celular sem o nono dígito (não completa chamada)',
  tamanho_invalido: 'Telefone com quantidade de dígitos inválida',
  suspeito: 'Telefone fora do padrão',
}

export interface DiagnosticoContato {
  telefoneRuim: boolean
  telefoneDivergente: boolean
  cepIncompleto: boolean
  /** Texto curto de cada problema, para a lista de responsáveis. Sem repetição. */
  motivos: string[]
}

export function diagnosticarContato(contato: ContatoResponsavel): DiagnosticoContato {
  const classes = [classificarTelefone(contato.telefone_perfil), classificarTelefone(contato.telefone_principal)]
  const comProblema = classes.filter(c => CLASSES_COM_PROBLEMA.has(c))

  // Divergir só faz sentido com os dois preenchidos; formatado ou não, o mesmo número não diverge.
  const preenchidos = classes.every(c => c !== 'vazio')
  const telefoneDivergente = preenchidos
    && somenteDigitosTelefone(contato.telefone_perfil) !== somenteDigitosTelefone(contato.telefone_principal)

  const cepIncompleto = !validarCep(contato.cep).valido

  const motivos = [
    ...new Set(comProblema.map(c => MOTIVO_POR_CLASSE[c]).filter((m): m is string => Boolean(m))),
    ...(telefoneDivergente ? ['Telefones diferentes nos dois cadastros'] : []),
    ...(cepIncompleto ? ['CEP incompleto ou inválido'] : []),
  ]

  return { telefoneRuim: comProblema.length > 0, telefoneDivergente, cepIncompleto, motivos }
}

/** Filtros de /admin/responsaveis?problema=...; o painel da home aponta para eles. */
export const FILTROS_RESPONSAVEL = ['telefone', 'telefone-divergente', 'cep'] as const
export type FiltroResponsavel = typeof FILTROS_RESPONSAVEL[number]

export function lerFiltroResponsavel(valor: unknown): FiltroResponsavel | null {
  return FILTROS_RESPONSAVEL.find(f => f === valor) ?? null
}

/** A lista filtrada e a contagem do painel usam esta mesma função: nunca divergem. */
export function casaComFiltro(diagnostico: DiagnosticoContato, filtro: FiltroResponsavel): boolean {
  if (filtro === 'telefone') return diagnostico.telefoneRuim
  if (filtro === 'telefone-divergente') return diagnostico.telefoneDivergente
  return diagnostico.cepIncompleto
}

export interface ContagensContato {
  responsaveis: number
  /** Pessoas, não campos: quem está ruim nos dois cadastros conta uma vez. */
  telefoneRuim: number
  telefoneDivergente: number
  cepIncompleto: number
}

export function contarProblemas(contatos: ContatoResponsavel[]): ContagensContato {
  const diagnosticos = contatos.map(diagnosticarContato)
  const contar = (filtro: FiltroResponsavel) => diagnosticos.filter(d => casaComFiltro(d, filtro)).length
  return {
    responsaveis: contatos.length,
    telefoneRuim: contar('telefone'),
    telefoneDivergente: contar('telefone-divergente'),
    cepIncompleto: contar('cep'),
  }
}

/** Ids dos pacientes ativos sem nenhuma linha em paciente_responsaveis. */
export function pacientesAtivosSemResponsavel(
  pacientes: Array<{ id: string; status: string }>,
  vinculos: Array<{ paciente_id: string }>,
): string[] {
  const comResponsavel = new Set(vinculos.map(v => v.paciente_id))
  return pacientes.filter(p => p.status === 'ativo' && !comResponsavel.has(p.id)).map(p => p.id)
}

export type ChaveProblema = 'telefone' | 'telefone-divergente' | 'cep' | 'sem-responsavel'

export interface LinhaDoPainel {
  chave: ChaveProblema
  contagem: number
  /** Diz o que fazer, não só o que está errado. Nunca traz número de telefone. */
  texto: string
  href: string
}

const plural = (n: number, singular: string, pluralForma: string) => (n === 1 ? singular : pluralForma)

/**
 * Cada linha só existe com contagem maior que zero; tudo limpo devolve [] e o painel some
 * (alerta que nunca zera vira paisagem). `pacientesSemResponsavel` é null quando quem vê não
 * pode listar pacientes: sem a lista inteira a contagem seria parcial.
 */
export function linhasDoPainel(c: ContagensContato, pacientesSemResponsavel: number | null): LinhaDoPainel[] {
  const linhas: LinhaDoPainel[] = []

  if (c.telefoneRuim > 0) {
    linhas.push({
      chave: 'telefone',
      contagem: c.telefoneRuim,
      texto: `${c.telefoneRuim} ${plural(c.telefoneRuim, 'responsável com telefone que não completa chamada', 'responsáveis com telefone que não completam chamada')} (celular sem o nono dígito ou fora do padrão) — confirmar o número com a família`,
      href: '/admin/responsaveis?problema=telefone',
    })
  }
  if (c.telefoneDivergente > 0) {
    linhas.push({
      chave: 'telefone-divergente',
      contagem: c.telefoneDivergente,
      texto: `${c.telefoneDivergente} ${plural(c.telefoneDivergente, 'responsável', 'responsáveis')} com telefones diferentes nos dois cadastros — confirmar com a família qual é o certo`,
      href: '/admin/responsaveis?problema=telefone-divergente',
    })
  }
  if (c.cepIncompleto > 0) {
    linhas.push({
      chave: 'cep',
      contagem: c.cepIncompleto,
      texto: `${c.cepIncompleto} ${plural(c.cepIncompleto, 'responsável', 'responsáveis')} com CEP incompleto ou inválido — conferir o CEP com a família`,
      href: '/admin/responsaveis?problema=cep',
    })
  }
  if (pacientesSemResponsavel !== null && pacientesSemResponsavel > 0) {
    linhas.push({
      chave: 'sem-responsavel',
      contagem: pacientesSemResponsavel,
      texto: `${pacientesSemResponsavel} ${plural(pacientesSemResponsavel, 'paciente ativo', 'pacientes ativos')} sem responsável vinculado — vincular um responsável`,
      href: '/admin/pacientes?sem_responsavel=1',
    })
  }

  return linhas
}
