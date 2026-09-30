export interface HorarioFixo {
  dia: string
  hora: string
}

// Mesma ordem usada por gerarSessoes. Domingo não entra: a clínica não atende.
export const DIAS_SEMANA = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'] as const

export const DIAS_ATENDIDOS = DIAS_SEMANA.filter(d => d !== 'domingo')

export const LABEL_DIA: Record<string, string> = {
  segunda: 'segunda-feira',
  terca: 'terça-feira',
  quarta: 'quarta-feira',
  quinta: 'quinta-feira',
  sexta: 'sexta-feira',
  sabado: 'sábado',
}

/** Dia da semana de um instante, no fuso da clínica (UTC-3). */
export function diaDaSemanaBRT(iso: string): string {
  const brt = new Date(new Date(iso).getTime() - 3 * 60 * 60 * 1000)
  return DIAS_SEMANA[brt.getUTCDay()]
}

/** Hora "HH:MM" de um instante, no fuso da clínica. */
export function horaBRT(iso: string): string {
  const brt = new Date(new Date(iso).getTime() - 3 * 60 * 60 * 1000)
  return brt.toISOString().slice(11, 16)
}

export function ehDiaAtendido(dia: string): boolean {
  return (DIAS_ATENDIDOS as readonly string[]).includes(dia)
}

/** "9:5" e "09:05" são o mesmo horário; compara de forma normalizada. */
function normalizar(h: HorarioFixo): string {
  const [hh = '', mm = ''] = String(h.hora).split(':')
  return `${h.dia}|${hh.padStart(2, '0')}:${mm.padStart(2, '0')}`
}

export function contemHorario(lista: HorarioFixo[], alvo: HorarioFixo): boolean {
  const chave = normalizar(alvo)
  return lista.some(h => normalizar(h) === chave)
}

export function adicionarHorario(lista: HorarioFixo[], novo: HorarioFixo): HorarioFixo[] {
  if (contemHorario(lista, novo)) return lista
  return [...lista, novo].sort((a, b) => normalizar(a).localeCompare(normalizar(b)))
}

export function removerHorario(lista: HorarioFixo[], alvo: HorarioFixo): HorarioFixo[] {
  const chave = normalizar(alvo)
  return lista.filter(h => normalizar(h) !== chave)
}

/** Aceita apenas `{ dia, hora }` com dia atendido e hora HH:MM. */
export function validarHorario(valor: unknown): HorarioFixo | null {
  if (!valor || typeof valor !== 'object') return null
  const { dia, hora } = valor as Record<string, unknown>
  if (typeof dia !== 'string' || !ehDiaAtendido(dia)) return null
  if (typeof hora !== 'string' || !/^\d{1,2}:\d{2}$/.test(hora)) return null
  const [hh, mm] = hora.split(':').map(Number)
  if (hh > 23 || mm > 59) return null
  return { dia, hora: `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}` }
}

export type DistribuicaoHorarios =
  | { ok: true; porTerapeuta: Map<string, HorarioFixo[]> }
  | { ok: false; erro: string }

/**
 * Reparte os horários informados no cadastro entre as profissionais que vão atender.
 *
 * O horário fixo pertence a uma profissional (vive no vínculo dela). Com uma só,
 * tudo é dela. Com várias, cada horário precisa dizer de quem é: não existe jeito
 * de adivinhar, e chutar mandaria o aviso de cancelamento para a pessoa errada.
 */
export function distribuirHorariosPorTerapeuta(entrada: unknown, terapeutaIds: string[]): DistribuicaoHorarios {
  const porTerapeuta = new Map<string, HorarioFixo[]>(terapeutaIds.map(id => [id, []]))
  const linhas = Array.isArray(entrada) ? entrada : []
  if (linhas.length === 0) return { ok: true, porTerapeuta }

  if (terapeutaIds.length === 0) {
    return { ok: false, erro: 'Escolha a profissional que atende nesses horários.' }
  }

  for (const linha of linhas) {
    const horario = validarHorario(linha)
    if (!horario) return { ok: false, erro: 'Horário inválido. Use dia da semana e hora no formato HH:MM.' }

    let dona: string | undefined
    if (terapeutaIds.length === 1) {
      dona = terapeutaIds[0]
    } else {
      const indicada = (linha as Record<string, unknown>).terapeuta_id
      dona = typeof indicada === 'string' && porTerapeuta.has(indicada) ? indicada : undefined
    }
    if (!dona) {
      return { ok: false, erro: 'Com mais de uma profissional, indique quem atende cada horário.' }
    }

    porTerapeuta.set(dona, adicionarHorario(porTerapeuta.get(dona) ?? [], horario))
  }

  return { ok: true, porTerapeuta }
}
