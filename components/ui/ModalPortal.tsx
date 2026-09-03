'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

/**
 * Renderiza o conteúdo direto no <body>, fora de qualquer ancestral que possa
 * criar containing block para position:fixed (transform, filter, will-change,
 * contain...). Sem isso, um overlay `fixed inset-0` se ancora na altura do
 * conteúdo e não no viewport — o modal aparece no meio da página e exige rolar.
 */
export function ModalPortal({ children }: { children: ReactNode }) {
  const [montado, setMontado] = useState(false)

  useEffect(() => {
    setMontado(true)
    const anterior = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = anterior
    }
  }, [])

  if (!montado) return null
  return createPortal(children, document.body)
}
