export const TIPOS_PROFISSIONAIS = [
  { value: 'terapeuta_ocupacional', label: 'Terapeuta Ocupacional', conselho: 'CREFITO' },
  { value: 'fisioterapeuta', label: 'Fisioterapeuta', conselho: 'CREFITO' },
  { value: 'fonoaudiologa', label: 'Fonoaudióloga', conselho: 'CRFa' },
  { value: 'psicologa', label: 'Psicóloga', conselho: 'CRP' },
  { value: 'neuropsicologa', label: 'Neuropsicóloga', conselho: 'CRP' },
  { value: 'neuropsicopedagoga', label: 'Neuropsicopedagoga', conselho: 'CBO' },
  { value: 'nutricionista', label: 'Nutricionista', conselho: 'CRN' },
] as const

export type TipoProfissional = typeof TIPOS_PROFISSIONAIS[number]['value']

export function isTipoProfissional(value: unknown): value is TipoProfissional {
  return typeof value === 'string' && TIPOS_PROFISSIONAIS.some(tipo => tipo.value === value)
}

export function getTipoProfissionalConfig(value?: string | null) {
  return TIPOS_PROFISSIONAIS.find(tipo => tipo.value === value) ?? TIPOS_PROFISSIONAIS[0]
}

export function formatarConselhoProfissional({
  tipoProfissional,
  conselhoTipo,
  conselhoNumero,
  crefitoLegado,
}: {
  tipoProfissional?: string | null
  conselhoTipo?: string | null
  conselhoNumero?: string | null
  crefitoLegado?: string | null
}) {
  const numero = (conselhoNumero ?? crefitoLegado ?? '').trim()
  if (!numero) return ''

  const tipo = (conselhoTipo ?? getTipoProfissionalConfig(tipoProfissional).conselho).trim()
  return `${tipo} ${numero}`
}
