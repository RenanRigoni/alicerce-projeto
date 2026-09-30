export interface Encaminhamento {
  id: string
  paciente_id: string
  medico_nome: string
  medico_crm: string | null
  medico_crm_uf: string | null
  especialidade: string | null
  data_encaminhamento: string | null
  motivo: string | null
  observacoes: string | null
  criado_em: string
  atualizado_em: string | null
}

export const SELECT_ENCAMINHAMENTOS =
  'id, paciente_id, medico_nome, medico_crm, medico_crm_uf, especialidade, data_encaminhamento, motivo, observacoes, criado_em, atualizado_em'

export const UFS = [
  'AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MG', 'MS', 'MT', 'PA', 'PB',
  'PE', 'PI', 'PR', 'RJ', 'RN', 'RO', 'RR', 'RS', 'SC', 'SE', 'SP', 'TO',
] as const

export const LIMITES = {
  medico_nome: 200,
  medico_crm: 10,
  especialidade: 120,
  motivo: 2000,
  observacoes: 4000,
} as const

// O que a tela mantém em estado: tudo texto, como vem dos inputs.
export interface FormEncaminhamento {
  medico_nome: string
  medico_crm: string
  medico_crm_uf: string
  especialidade: string
  data_encaminhamento: string
  motivo: string
  observacoes: string
}

// O que vai para o banco: vazio vira null e o CRM guarda só dígitos.
export interface DadosEncaminhamento {
  medico_nome: string
  medico_crm: string | null
  medico_crm_uf: string | null
  especialidade: string | null
  data_encaminhamento: string | null
  motivo: string | null
  observacoes: string | null
}

export type ValidacaoEncaminhamento =
  | { valido: true; dados: DadosEncaminhamento }
  | { valido: false; erro: string }

export const FORM_VAZIO: FormEncaminhamento = {
  medico_nome: '', medico_crm: '', medico_crm_uf: '', especialidade: '',
  data_encaminhamento: '', motivo: '', observacoes: '',
}

export function formDoEncaminhamento(e: Encaminhamento): FormEncaminhamento {
  return {
    medico_nome: e.medico_nome,
    medico_crm: e.medico_crm ?? '',
    medico_crm_uf: e.medico_crm_uf ?? '',
    especialidade: e.especialidade ?? '',
    data_encaminhamento: e.data_encaminhamento ?? '',
    motivo: e.motivo ?? '',
    observacoes: e.observacoes ?? '',
  }
}

/** CRM é numérico; o que a pessoa colar ("CRM 12.345") vira só dígitos. */
export function mascaraCrm(valor: string): string {
  return valor.replace(/\D/g, '').slice(0, LIMITES.medico_crm)
}

/** "12345/MG", "12345" ou null quando não há CRM. A UF sozinha não vira CRM. */
export function formatarCrm(crm: string | null, uf: string | null): string | null {
  if (!crm) return null
  return uf ? `${crm}/${uf}` : crm
}

const DATA_ISO = /^(\d{4})-(\d{2})-(\d{2})$/

function dataValida(valor: string): boolean {
  const m = DATA_ISO.exec(valor)
  if (!m) return false
  const [ano, mes, dia] = [Number(m[1]), Number(m[2]), Number(m[3])]
  if (ano < 1900 || ano > 2100) return false
  const d = new Date(Date.UTC(ano, mes - 1, dia))
  return d.getUTCFullYear() === ano && d.getUTCMonth() === mes - 1 && d.getUTCDate() === dia
}

const vazioParaNull = (valor: string) => (valor.trim() ? valor.trim() : null)

/**
 * Só o nome do médico é obrigatório. CRM, UF, especialidade, data, motivo e
 * observações são opcionais: a equipe pediu que nada trave o salvamento.
 */
export function validarEncaminhamento(form: FormEncaminhamento): ValidacaoEncaminhamento {
  const nome = form.medico_nome.trim()
  if (!nome) return { valido: false, erro: 'Informe o nome do médico.' }

  const campos: Array<[keyof typeof LIMITES, string, string]> = [
    ['medico_nome', form.medico_nome, 'Nome do médico'],
    ['especialidade', form.especialidade, 'Especialidade'],
    ['motivo', form.motivo, 'Motivo'],
    ['observacoes', form.observacoes, 'Observações'],
  ]
  for (const [chave, valor, rotulo] of campos) {
    if (valor.trim().length > LIMITES[chave]) {
      return { valido: false, erro: `${rotulo} passa de ${LIMITES[chave]} caracteres.` }
    }
  }

  const crm = mascaraCrm(form.medico_crm)
  if (form.medico_crm.trim() && !crm) {
    return { valido: false, erro: 'CRM deve ter apenas números.' }
  }

  const uf = form.medico_crm_uf.trim().toUpperCase()
  if (uf && !(UFS as readonly string[]).includes(uf)) {
    return { valido: false, erro: 'UF do CRM inválida.' }
  }

  const data = form.data_encaminhamento.trim()
  if (data && !dataValida(data)) {
    return { valido: false, erro: 'Data do encaminhamento inválida.' }
  }

  return {
    valido: true,
    dados: {
      medico_nome: nome,
      medico_crm: crm || null,
      medico_crm_uf: uf || null,
      especialidade: vazioParaNull(form.especialidade),
      data_encaminhamento: data || null,
      motivo: vazioParaNull(form.motivo),
      observacoes: vazioParaNull(form.observacoes),
    },
  }
}

/** Escapa os curingas do LIKE para que "50%" ou "a_b" sejam buscados como texto. */
export function escaparLike(texto: string): string {
  return texto.replace(/[\\%_]/g, c => `\\${c}`)
}

export interface SugestaoMedico {
  medico_nome: string
  medico_crm: string | null
  medico_crm_uf: string | null
  especialidade: string | null
}

/**
 * Junta as grafias do mesmo médico (sem diferenciar maiúscula/minúscula) numa só
 * sugestão. Recebe as linhas da mais recente para a mais antiga e fica com a
 * primeira de cada nome, então a sugestão traz os dados do encaminhamento mais novo.
 */
export function sugestoesDeMedicos(linhas: SugestaoMedico[], limite = 8): SugestaoMedico[] {
  const vistos = new Set<string>()
  const sugestoes: SugestaoMedico[] = []
  for (const linha of linhas) {
    const chave = linha.medico_nome.trim().toLowerCase()
    if (!chave || vistos.has(chave)) continue
    vistos.add(chave)
    sugestoes.push(linha)
    if (sugestoes.length >= limite) break
  }
  return sugestoes
}
