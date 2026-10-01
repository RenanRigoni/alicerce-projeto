// Telefone: DDD e número em campos separados na tela, UMA string de dígitos no banco.
// Tudo aqui é puro (sem React) para a tela, as rotas e o painel de qualidade de dados
// usarem exatamente a mesma regra.

/** DDD + número. */
export const MAX_DIGITOS_TELEFONE = 11
/** O número sem DDD tem 8 (fixo) ou 9 (celular) dígitos. */
export const MAX_DIGITOS_NUMERO = 9
const TAMANHO_DDD = 2
const TAMANHO_SUFIXO = 4

/**
 * Só os dígitos, SEM cortar em 11: quem decide se o tamanho serve é `validarTelefone`.
 * Cortar aqui esconderia os 12 dígitos que existem hoje em produção.
 */
export function somenteDigitosTelefone(valor: unknown): string {
  return String(valor ?? '').replace(/\D/g, '')
}

/**
 * Máscara do número (sem DDD) ancorada à direita: o sufixo são SEMPRE os 4 últimos dígitos
 * e o prefixo cresce de 1 até 5 ("1234", "1-2345", ..., "12345-6789"). Não se sabe se o
 * número tem 8 ou 9 dígitos até a pessoa terminar de digitar; assim todo estado
 * intermediário está certo para os dois tamanhos e o hífen nunca salta nem fica solto.
 */
export function mascaraNumeroTelefone(valor: unknown): string {
  const d = somenteDigitosTelefone(valor)
  if (d.length <= TAMANHO_SUFIXO) return d
  return `${d.slice(0, d.length - TAMANHO_SUFIXO)}-${d.slice(-TAMANHO_SUFIXO)}`
}

export interface TelefoneSeparado {
  ddd: string
  numero: string
}

/** Decompõe o valor gravado: com 10 dígitos ou mais os 2 primeiros são o DDD; menos que isso é número sem DDD. */
export function separarTelefone(valor: unknown): TelefoneSeparado {
  const d = somenteDigitosTelefone(valor)
  if (d.length >= 10) return { ddd: d.slice(0, TAMANHO_DDD), numero: d.slice(TAMANHO_DDD) }
  return { ddd: '', numero: d }
}

/**
 * Compõe o valor a gravar. DDD de 1 dígito invalida o conjunto (devolve só o DDD, tamanho
 * inválido): colar esse dígito no número pareceria um telefone sem DDD e passaria
 * calado como número do médico.
 */
export function juntarTelefone(ddd: string, numero: string): string {
  if (ddd.length === 1) return ddd
  return ddd + numero
}

/**
 * Texto colado ("(34) 99882-2549", "34998822549", "+55 34 99882-2549", "034 99882-2549")
 * distribuído entre DDD e número. Só o número (8 ou 9 dígitos) volta com `ddd` vazio:
 * quem chama mantém o DDD que já estava no campo.
 */
export function distribuirTelefoneColado(texto: string): TelefoneSeparado {
  let d = somenteDigitosTelefone(texto)
  if (d.length >= 12 && d.startsWith('55')) d = d.slice(2) // código do país
  if (d.length >= 11 && d.startsWith('0')) d = d.slice(1) // zero de operadora; DDD nunca começa com 0
  return separarTelefone(d.slice(0, MAX_DIGITOS_TELEFONE))
}

/**
 * Dígitos que chegaram no campo do número. Se o DDD ainda está vazio e a pessoa digitou o
 * telefone inteiro direto aqui, o 10º dígito separa o DDD; com DDD preenchido, o número
 * para em 9 dígitos.
 */
export function aplicarNumeroDigitado(dddAtual: string, digitos: string): TelefoneSeparado {
  if (dddAtual === '' && digitos.length >= 10) return distribuirTelefoneColado(digitos)
  return { ddd: dddAtual, numero: digitos.slice(0, MAX_DIGITOS_NUMERO) }
}

/** Índice do cursor logo depois do n-ésimo dígito do texto mascarado (para devolvê-lo ao lugar após remascarar). */
export function posicaoDoCursor(mascarado: string, digitosAEsquerda: number): number {
  if (digitosAEsquerda <= 0) return 0
  let vistos = 0
  for (let i = 0; i < mascarado.length; i++) {
    if (/\d/.test(mascarado[i])) vistos++
    if (vistos === digitosAEsquerda) return i + 1
  }
  return mascarado.length
}

/**
 * Telefone para LEITURA: "(34) 99882-2549", "(34) 3333-4444", "99882-2549" (sem DDD).
 * Tamanho que não é de telefone (12 dígitos legados, número pela metade) sai como está,
 * sem inventar formato.
 */
export function formatarTelefone(valor: unknown): string {
  const d = somenteDigitosTelefone(valor)
  if (d.length === 8 || d.length === 9) return mascaraNumeroTelefone(d)
  if (d.length === 10 || d.length === 11) {
    return `(${d.slice(0, TAMANHO_DDD)}) ${mascaraNumeroTelefone(d.slice(TAMANHO_DDD))}`
  }
  return d
}

// ── classificação: a única definição de "telefone bom" ──

export type ClasseTelefone =
  | 'vazio'
  | 'celular'
  | 'fixo'
  | 'celular_sem_nono_digito'
  | 'suspeito'
  | 'sem_ddd'
  | 'tamanho_invalido'

export interface OpcoesTelefone {
  /** 8 ou 9 dígitos, sem DDD, valem. Só o telefone do médico: a recepção é local e disca sem DDD. */
  aceitaSemDdd?: boolean
}

/**
 * - vazio                                  → vazio (campo opcional)
 * - 11 dígitos, 3º dígito = 9              → celular
 * - 10 dígitos, 1º do número entre 2 e 5   → fixo
 * - 10 dígitos, 1º do número 8 ou 9        → celular_sem_nono_digito (formato antigo, não completa chamada)
 * - 11 dígitos, 3º dígito ≠ 9              → suspeito
 * - 10 dígitos, 1º do número 0, 1, 6 ou 7  → suspeito (nem fixo nem celular)
 * - qualquer outro tamanho                 → tamanho_invalido
 */
export function classificarTelefone(valor: unknown, opcoes: OpcoesTelefone = {}): ClasseTelefone {
  const texto = String(valor ?? '').trim()
  if (!texto) return 'vazio'
  const d = somenteDigitosTelefone(texto)

  if (d.length === 11) return d[2] === '9' ? 'celular' : 'suspeito'
  if (d.length === 10) {
    const inicio = d[2]
    if (inicio >= '2' && inicio <= '5') return 'fixo'
    if (inicio === '8' || inicio === '9') return 'celular_sem_nono_digito'
    return 'suspeito'
  }
  if ((d.length === 8 || d.length === 9) && opcoes.aceitaSemDdd) return 'sem_ddd'
  return 'tamanho_invalido'
}

export type ValidacaoTelefone =
  | {
      valido: true
      /** Só dígitos, ou null quando vazio. Nunca corrigido: o 9 que falta não é prefixado sozinho. */
      telefone: string | null
      classe: Exclude<ClasseTelefone, 'tamanho_invalido'>
      /** Salva mesmo assim, mas a tela mostra. */
      aviso: string | null
      mensagem?: undefined
    }
  | { valido: false; telefone: null; classe: 'tamanho_invalido'; aviso: null; mensagem: string }

const AVISO_SEM_NONO = 'Celular sem o nono dígito — esse número não completa chamada. Confirme o número com a família.'
const AVISO_SUSPEITO = 'Número fora do padrão — confira os dígitos e confirme com a família.'

function mensagemTamanho(digitos: number, aceitaSemDdd: boolean): string {
  const esperado = aceitaSemDdd ? '8 a 11 dígitos (o DDD é opcional)' : 'DDD + número, 10 ou 11 dígitos'
  if (digitos === 0) return `Telefone inválido — use apenas números (${esperado}).`
  if (digitos > MAX_DIGITOS_TELEFONE) {
    const sobram = digitos - MAX_DIGITOS_TELEFONE
    return `Telefone com ${sobram} ${sobram === 1 ? 'dígito' : 'dígitos'} a mais — use ${esperado}.`
  }
  return `Telefone incompleto — use ${esperado}.`
}

/**
 * Mesma regra na tela, nas rotas e no painel. Só `tamanho_invalido` barra o salvamento:
 * celular sem o nono dígito e número suspeito já existem em produção (telefone de família,
 * ninguém deduz) e salvam com aviso; o painel da home os expõe para a recepção confirmar.
 */
export function validarTelefone(valor: unknown, opcoes: OpcoesTelefone = {}): ValidacaoTelefone {
  const classe = classificarTelefone(valor, opcoes)
  if (classe === 'tamanho_invalido') {
    return {
      valido: false,
      telefone: null,
      classe,
      aviso: null,
      mensagem: mensagemTamanho(somenteDigitosTelefone(valor).length, opcoes.aceitaSemDdd === true),
    }
  }
  if (classe === 'vazio') return { valido: true, telefone: null, classe, aviso: null }
  return {
    valido: true,
    telefone: somenteDigitosTelefone(valor),
    classe,
    aviso: classe === 'celular_sem_nono_digito' ? AVISO_SEM_NONO : classe === 'suspeito' ? AVISO_SUSPEITO : null,
  }
}

const SEPARADOR_CONTATO_EMERGENCIA = ' — '

/**
 * `contato_emergencia` é um texto só ("Nome — (34) 99882-2549"). Valida o telefone depois do
 * separador, com a mesma regra dos outros campos. Sem separador não há telefone para validar.
 */
export function validarTelefoneDoContatoEmergencia(texto: unknown): ValidacaoTelefone {
  if (typeof texto !== 'string') return validarTelefone(null)
  const indice = texto.indexOf(SEPARADOR_CONTATO_EMERGENCIA)
  if (indice === -1) return validarTelefone(null)
  return validarTelefone(texto.slice(indice + SEPARADOR_CONTATO_EMERGENCIA.length))
}

/** Valor a gravar: só dígitos, null para vazio E para inválido; valide antes com `validarTelefone`. */
export function normalizarTelefone(valor: unknown, opcoes: OpcoesTelefone = {}): string | null {
  const r = validarTelefone(valor, opcoes)
  return r.valido ? r.telefone : null
}
