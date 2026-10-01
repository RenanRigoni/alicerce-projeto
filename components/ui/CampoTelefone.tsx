'use client'

import { useLayoutEffect, useRef, useState, type ChangeEvent, type ClipboardEvent, type CSSProperties, type FocusEvent, type KeyboardEvent } from 'react'
import {
  MAX_DIGITOS_NUMERO,
  aplicarNumeroDigitado,
  distribuirTelefoneColado,
  juntarTelefone,
  mascaraNumeroTelefone,
  posicaoDoCursor,
  separarTelefone,
  somenteDigitosTelefone,
  validarTelefone,
  type OpcoesTelefone,
  type TelefoneSeparado,
} from '@/lib/telefone'

interface Props extends OpcoesTelefone {
  /** Dígitos gravados (DDD + número). Aceita também texto já mascarado: só os dígitos contam. */
  value: string
  /** Sempre recebe só dígitos — o mesmo formato que vai para o banco. */
  onChange: (digitos: string) => void
  /** id do campo do número: é para ele que o <label htmlFor> aponta. */
  id?: string
  /** Para formulário nativo (FormData / server action): inclui um campo oculto com os dígitos. */
  name?: string
  disabled?: boolean
  required?: boolean
  /** Classe e estilo dos dois inputs (cada tela já tem o seu). */
  className?: string
  style?: CSSProperties
}

function inputType(e: ChangeEvent<HTMLInputElement>): string {
  return (e.nativeEvent as InputEvent).inputType ?? ''
}

/**
 * DDD (2 dígitos) e número (8 ou 9) em dois campos. A tela compõe e decompõe: quem usa vê
 * uma string de dígitos só, como no banco. O número usa máscara ancorada à direita, então o
 * hífen aparece no 5º dígito e nunca salta. Digitou 2 dígitos no DDD, o foco vai para o
 * número; Backspace no começo do número volta para o DDD; colar "(34) 99882-2549" ou
 * "+55 34 99882-2549" em qualquer um dos dois distribui nos dois campos.
 */
export function CampoTelefone({
  value, onChange, id, name, disabled, required, className = 'input-base', style, aceitaSemDdd,
}: Props) {
  const [partes, setPartes] = useState<TelefoneSeparado>(() => separarTelefone(value))
  const [tocado, setTocado] = useState(false)
  const dddRef = useRef<HTMLInputElement>(null)
  const numeroRef = useRef<HTMLInputElement>(null)
  const cursorPendente = useRef<number | null>(null)

  // Valor mudou por fora (formulário recarregado, sugestão aplicada): refaz os campos.
  // juntar(separar(v)) é sempre v, então isto não entra em laço.
  const externo = somenteDigitosTelefone(value)
  if (juntarTelefone(partes.ddd, partes.numero) !== externo) {
    setPartes(separarTelefone(externo))
  }

  // Devolve o cursor ao lugar depois de remascarar (o hífen muda de posição a cada dígito).
  useLayoutEffect(() => {
    const posicao = cursorPendente.current
    cursorPendente.current = null
    const campo = numeroRef.current
    if (posicao !== null && campo && document.activeElement === campo) campo.setSelectionRange(posicao, posicao)
  })

  function atualizar(proximo: TelefoneSeparado) {
    setPartes(proximo)
    onChange(juntarTelefone(proximo.ddd, proximo.numero))
  }

  function focarNumeroNoFim() {
    const campo = numeroRef.current
    if (!campo) return
    campo.focus()
    const fim = campo.value.length
    campo.setSelectionRange(fim, fim)
  }

  function focarDddNoFim() {
    const campo = dddRef.current
    if (!campo) return
    campo.focus()
    const fim = campo.value.length
    campo.setSelectionRange(fim, fim)
  }

  function handleDdd(e: ChangeEvent<HTMLInputElement>) {
    const ddd = somenteDigitosTelefone(e.target.value).slice(0, 2)
    atualizar({ ddd, numero: partes.numero })
    if (ddd.length === 2 && inputType(e).startsWith('insert')) focarNumeroNoFim()
  }

  function handleNumero(e: ChangeEvent<HTMLInputElement>) {
    const campo = e.currentTarget
    const bruto = campo.value
    let digitos = somenteDigitosTelefone(bruto)
    let aEsquerda = somenteDigitosTelefone(bruto.slice(0, campo.selectionStart ?? bruto.length)).length

    // Backspace/Delete que só levou o hífen embora: os dígitos não mudaram e a máscara
    // recolocaria o hífen (campo "travado"). Apaga o dígito vizinho no lugar dele.
    const tipo = inputType(e)
    if (digitos === partes.numero) {
      if (tipo === 'deleteContentBackward' && aEsquerda > 0) {
        digitos = digitos.slice(0, aEsquerda - 1) + digitos.slice(aEsquerda)
        aEsquerda -= 1
      } else if (tipo === 'deleteContentForward' && aEsquerda < digitos.length) {
        digitos = digitos.slice(0, aEsquerda) + digitos.slice(aEsquerda + 1)
      }
    }

    const proximo = aplicarNumeroDigitado(partes.ddd, digitos)
    const mascarado = mascaraNumeroTelefone(proximo.numero)
    cursorPendente.current = proximo.ddd !== partes.ddd
      ? mascarado.length
      : posicaoDoCursor(mascarado, Math.min(aEsquerda, proximo.numero.length))
    atualizar(proximo)
  }

  function handleTeclaNumero(e: KeyboardEvent<HTMLInputElement>) {
    const campo = e.currentTarget
    if (e.key === 'Backspace' && campo.selectionStart === 0 && campo.selectionEnd === 0) {
      e.preventDefault()
      focarDddNoFim()
    }
  }

  function handleColar(e: ClipboardEvent<HTMLInputElement>, doDdd: boolean) {
    const texto = e.clipboardData.getData('text')
    const colado = distribuirTelefoneColado(texto)
    const quantidade = somenteDigitosTelefone(texto).length
    // Digitação comum de DDD, ou número simples no campo do número: o navegador cola e o onChange cuida.
    if (doDdd ? quantidade <= 2 : colado.ddd === '') return
    e.preventDefault()
    // Só o número (8 ou 9 dígitos) colado no DDD: o DDD que já estava fica.
    atualizar(colado.ddd ? colado : { ddd: partes.ddd, numero: colado.numero.slice(0, MAX_DIGITOS_NUMERO) })
    focarNumeroNoFim()
  }

  function handleSaiu(e: FocusEvent<HTMLDivElement>) {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setTocado(true)
  }

  const composto = juntarTelefone(partes.ddd, partes.numero)
  const validacao = validarTelefone(composto, { aceitaSemDdd })
  const mensagem = tocado ? (validacao.valido ? validacao.aviso : validacao.mensagem) : null
  const invalido = tocado && !validacao.valido

  return (
    <div onBlur={handleSaiu}>
      {name && <input type="hidden" name={name} value={composto} />}
      <div className="flex gap-2">
        <div className="w-[5.5rem] shrink-0">
          <input
            ref={dddRef}
            value={partes.ddd}
            onChange={handleDdd}
            onPaste={e => handleColar(e, true)}
            inputMode="numeric"
            autoComplete="tel-area-code"
            placeholder="DDD"
            aria-label="DDD"
            aria-invalid={invalido || undefined}
            disabled={disabled}
            className={className}
            style={style}
          />
        </div>
        <div className="flex-1 min-w-0">
          <input
            ref={numeroRef}
            id={id}
            type="tel"
            value={mascaraNumeroTelefone(partes.numero)}
            onChange={handleNumero}
            onKeyDown={handleTeclaNumero}
            onPaste={e => handleColar(e, false)}
            inputMode="numeric"
            autoComplete="tel-local"
            placeholder="00000-0000"
            aria-label={id ? undefined : 'Telefone'}
            aria-invalid={invalido || undefined}
            required={required}
            disabled={disabled}
            className={className}
            style={style}
          />
        </div>
      </div>
      {mensagem && (
        <p
          role={invalido ? 'alert' : 'status'}
          className="text-xs mt-1"
          style={{ color: invalido ? '#B91C1C' : 'var(--color-amber-deep)' }}
        >
          {mensagem}
        </p>
      )}
    </div>
  )
}
