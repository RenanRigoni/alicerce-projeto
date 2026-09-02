import { getTipoProfissionalConfig } from '@/lib/profissionais'

export interface AutorEvolucao {
  terapeuta_id?: string | null
  autor_nome?: string | null
  autor_tipo_profissional?: string | null
}

export interface OpcaoFiltro {
  value: string
  label: string
}

/**
 * Aplica os filtros de profissional e de profissão sobre a lista de evoluções.
 * Conjunto vazio = sem restrição naquela dimensão ("Todos").
 */
export function filtrarEvolucoes<T extends AutorEvolucao>(
  evolucoes: T[],
  profSel: Set<string>,
  tipoSel: Set<string>,
): T[] {
  return evolucoes.filter(e => {
    const passaProf = profSel.size === 0 || (e.terapeuta_id != null && profSel.has(e.terapeuta_id))
    const passaTipo = tipoSel.size === 0 || (e.autor_tipo_profissional != null && tipoSel.has(e.autor_tipo_profissional))
    return passaProf && passaTipo
  })
}

export function rotuloProfissional(tipo?: string | null): string | null {
  if (!tipo) return null
  return getTipoProfissionalConfig(tipo).label
}

/**
 * Linha de autoria de uma evolução: "Terapeuta Ocupacional · Santa Turci Dotti".
 */
export function autoriaEvolucao(autor: AutorEvolucao): string | null {
  const profissao = rotuloProfissional(autor.autor_tipo_profissional)
  const nome = autor.autor_nome?.trim() || null
  if (profissao && nome) return `${profissao} · ${nome}`
  return profissao ?? nome
}

export function listarProfissionais(evolucoes: AutorEvolucao[]): OpcaoFiltro[] {
  const mapa = new Map<string, string>()
  for (const e of evolucoes) {
    if (e.terapeuta_id) mapa.set(e.terapeuta_id, e.autor_nome?.trim() || 'Profissional')
  }
  return [...mapa.entries()]
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'))
}

export function listarProfissoes(evolucoes: AutorEvolucao[]): OpcaoFiltro[] {
  const set = new Set<string>()
  for (const e of evolucoes) {
    if (e.autor_tipo_profissional) set.add(e.autor_tipo_profissional)
  }
  return [...set]
    .map(value => ({ value, label: getTipoProfissionalConfig(value).label }))
    .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'))
}
