export type StatusPaciente = 'ativo' | 'alta' | 'desativado'
export type ModoLista = 'meus' | 'todos'

export interface PacienteDaLista {
  id: string
  nome: string
  codigo_interno: string | null
  status: StatusPaciente
  frequencia_atendimento: string | null
}

interface OpcoesFiltro {
  pacientes: PacienteDaLista[]
  meusIds: ReadonlySet<string>
  modo: ModoLista
  status: ReadonlySet<StatusPaciente>
  busca: string
}

function semAcento(valor: string): string {
  return valor.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

/** A equipe se refere ao paciente por "#155": o "#" não faz parte do código. */
export function normalizarBusca(busca: string): string {
  return semAcento(busca.trim()).replace(/^#/, '').trim()
}

export function filtrarPacientes({ pacientes, meusIds, modo, status, busca }: OpcoesFiltro): PacienteDaLista[] {
  const termo = normalizarBusca(busca)

  return pacientes.filter(p => {
    if (modo === 'meus' && !meusIds.has(p.id)) return false
    if (!status.has(p.status)) return false
    if (!termo) return true
    return semAcento(p.nome).includes(termo) || (p.codigo_interno ?? '').toLowerCase().includes(termo)
  })
}

export function lerModoSalvo(chave: string): ModoLista | null {
  try {
    const valor = window.sessionStorage.getItem(chave)
    return valor === 'meus' || valor === 'todos' ? valor : null
  } catch {
    return null
  }
}

export function salvarModo(chave: string, modo: ModoLista): void {
  try {
    window.sessionStorage.setItem(chave, modo)
  } catch {
    // storage bloqueado (navegação privativa): a escolha só não persiste.
  }
}
