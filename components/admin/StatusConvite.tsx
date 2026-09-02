'use client'

import { useState } from 'react'

export interface DadosConvite {
  email: string | null
  email_enviado: boolean
  email_erro?: string | null
  link_recuperacao?: string | null
}

interface Props {
  convite: DadosConvite
  /** Mensagem exibida quando o usuário foi cadastrado sem e-mail. */
  textoSemEmail?: string
}

const SEM_EMAIL_PADRAO =
  'Cadastrado sem e-mail. Compartilhe o link abaixo para o usuário definir a senha.'

/**
 * Mostra, após criar ou reenviar um acesso, se o e-mail realmente saiu — e,
 * quando não saiu, entrega o link de definição de senha para repasse manual.
 */
export function StatusConvite({ convite, textoSemEmail = SEM_EMAIL_PADRAO }: Props) {
  const [copiado, setCopiado] = useState(false)

  async function copiar() {
    if (!convite.link_recuperacao) return
    await navigator.clipboard.writeText(convite.link_recuperacao)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2500)
  }

  if (convite.email_enviado && convite.email) {
    return (
      <div
        className="rounded-xl p-4"
        style={{
          background: 'var(--color-status-confirmada-bg)',
          border: '1px solid var(--color-status-confirmada-border)',
        }}
      >
        <p className="text-sm font-medium" style={{ color: 'var(--color-status-confirmada-text)' }}>
          E-mail enviado para <strong>{convite.email}</strong>.
        </p>
        <p className="text-xs mt-1" style={{ color: 'var(--color-status-confirmada-text)' }}>
          Peça para conferir a caixa de entrada e também o spam. O link vale 24 horas.
        </p>
      </div>
    )
  }

  return (
    <div
      className="rounded-xl p-4 space-y-3"
      style={{ background: 'var(--color-amber-light)', border: '1px solid var(--color-amber-border)' }}
    >
      <p className="text-sm font-medium" style={{ color: 'var(--color-amber-deep)' }}>
        {convite.email ? 'E-mail não foi enviado.' : textoSemEmail}
      </p>

      {convite.email_erro && (
        <p className="text-xs" style={{ color: 'var(--color-amber-mid)' }}>
          Motivo: {convite.email_erro}
        </p>
      )}

      {convite.link_recuperacao ? (
        <>
          <div className="flex gap-2 items-start">
            <code
              className="text-xs break-all flex-1 bg-white rounded-lg p-2 border"
              style={{ borderColor: 'var(--color-amber-border)', color: 'var(--color-amber-deep)' }}
            >
              {convite.link_recuperacao}
            </code>
            <button
              type="button"
              onClick={copiar}
              className="shrink-0 text-xs font-medium px-3 py-2 rounded-lg transition-all"
              style={{
                background: copiado ? 'var(--color-status-confirmada-bg)' : 'var(--color-amber-light)',
                color: copiado ? 'var(--color-status-confirmada-text)' : 'var(--color-amber-deep)',
                border: `1px solid ${copiado ? 'var(--color-status-confirmada-border)' : 'var(--color-amber-border)'}`,
              }}
            >
              {copiado ? 'Copiado!' : 'Copiar'}
            </button>
          </div>
          <p className="text-xs" style={{ color: 'var(--color-amber-mid)' }}>
            Link válido por 24 horas. Envie por WhatsApp e peça para abrir no navegador.
          </p>
        </>
      ) : (
        <p className="text-xs" style={{ color: 'var(--color-amber-mid)' }}>
          Não foi possível gerar o link automaticamente. Use &quot;Reenviar acesso&quot; na página do usuário.
        </p>
      )}
    </div>
  )
}
