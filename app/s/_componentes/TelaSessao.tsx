'use client'

import { useActionState } from 'react'
import type { AcaoSessao, DadosSessao, TipoResultado } from '@/lib/sessao/confirmacao'
import { CartaoSessao, ResultadoSessao } from './ResultadoSessao'

const acaoConfig: Record<AcaoSessao, {
  emoji: string
  titulo: string
  instrucao: string
  botao: string
  botaoOcupado: string
  cor: string
  fundo: string
  borda: string
}> = {
  cancelar: {
    emoji: '📅',
    titulo: 'Cancelar esta sessão?',
    instrucao: 'Confira os dados acima. A sessão só é cancelada quando você tocar no botão.',
    botao: 'Sim, cancelar sessão',
    botaoOcupado: 'Cancelando…',
    cor: 'var(--color-status-cancelada-text)',
    fundo: 'var(--color-status-cancelada-bg)',
    borda: 'var(--color-status-cancelada-border)',
  },
  confirmar: {
    emoji: '📅',
    titulo: 'Confirmar esta sessão?',
    instrucao: 'Confira os dados acima. A presença só é confirmada quando você tocar no botão.',
    botao: 'Sim, confirmar presença',
    botaoOcupado: 'Confirmando…',
    cor: 'var(--color-status-confirmada-text)',
    fundo: 'var(--color-status-confirmada-bg)',
    borda: 'var(--color-status-confirmada-border)',
  },
}

interface Props {
  acao: AcaoSessao
  sessao: DadosSessao
  responder: (anterior: TipoResultado | null, formData: FormData) => Promise<TipoResultado>
}

export function TelaSessao({ acao, sessao, responder }: Props) {
  const [resultado, enviar, enviando] = useActionState(responder, null)

  if (resultado) return <ResultadoSessao resultado={resultado} sessao={sessao} />

  const c = acaoConfig[acao]

  return (
    <CartaoSessao emoji={c.emoji} titulo={c.titulo} cor={c.cor} fundo={c.fundo} borda={c.borda} sessao={sessao}>
      <p className="text-sm" style={{ color: 'var(--color-ink-soft)' }}>{c.instrucao}</p>

      <form action={enviar}>
        <button
          type="submit"
          disabled={enviando}
          className="w-full rounded-xl px-4 py-3 text-sm font-semibold transition-opacity hover:opacity-85 disabled:opacity-60"
          style={{ background: c.cor, color: 'var(--color-warm-white)' }}
        >
          {enviando ? c.botaoOcupado : c.botao}
        </button>
      </form>
    </CartaoSessao>
  )
}
