export const TIPOS_PROFISSIONAIS = [
  { value: 'terapeuta_ocupacional', label: 'Terapeuta Ocupacional', conselho: 'CREFITO' },
  { value: 'fisioterapeuta', label: 'Fisioterapeuta', conselho: 'CREFITO' },
  { value: 'fonoaudiologa', label: 'Fonoaudióloga', conselho: 'CRFa' },
  { value: 'psicologa', label: 'Psicóloga', conselho: 'CRP' },
  { value: 'neuropsicologa', label: 'Neuropsicóloga', conselho: 'CRP' },
  { value: 'neuropsicopedagoga', label: 'Neuropsicopedagoga', conselho: 'CBO' },
  { value: 'nutricionista', label: 'Nutricionista', conselho: 'CRN' },
] as const

export const UFS_BRASIL = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO',
  'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI',
  'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
] as const

export type TipoProfissional = typeof TIPOS_PROFISSIONAIS[number]['value']
export type UfBrasil = typeof UFS_BRASIL[number]

export function isTipoProfissional(value: unknown): value is TipoProfissional {
  return typeof value === 'string' && TIPOS_PROFISSIONAIS.some(tipo => tipo.value === value)
}

export function getTipoProfissionalConfig(value?: string | null) {
  return TIPOS_PROFISSIONAIS.find(tipo => tipo.value === value) ?? TIPOS_PROFISSIONAIS[0]
}

export function isUfBrasil(value: unknown): value is UfBrasil {
  return typeof value === 'string' && UFS_BRASIL.includes(value as UfBrasil)
}

export function normalizarCodigoCbo(value: unknown): string | null {
  if (typeof value !== 'string') return null

  const raw = value.trim()
  if (!raw) return null

  const digits = raw.replace(/\D/g, '')
  if (!digits) return raw

  if (digits.length !== 6) {
    return raw
  }

  return `${digits.slice(0, 4)}-${digits.slice(4)}`
}

export function isCodigoCboValido(value: string | null) {
  return value === null || /^\d{4}-\d{2}$/.test(value)
}

export function formatarConselhoProfissional({
  tipoProfissional,
  conselhoTipo,
  conselhoNumero,
  conselhoUf,
  crefitoLegado,
}: {
  tipoProfissional?: string | null
  conselhoTipo?: string | null
  conselhoNumero?: string | null
  conselhoUf?: string | null
  crefitoLegado?: string | null
}) {
  const numero = (conselhoNumero ?? crefitoLegado ?? '').trim()
  if (!numero) return ''

  const tipo = (conselhoTipo ?? getTipoProfissionalConfig(tipoProfissional).conselho).trim()
  const uf = (conselhoUf ?? '').trim().toUpperCase()
  return `${tipo}${uf ? ` ${uf}` : ''} ${numero}`
}
