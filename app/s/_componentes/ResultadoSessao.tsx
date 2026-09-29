import type { DadosSessao, TipoResultado } from '@/lib/sessao/confirmacao'

const configs: Record<TipoResultado, { emoji: string; titulo: string; mensagem: string; cor: string; fundo: string; borda: string }> = {
  confirmado: {
    emoji: '✅',
    titulo: 'Sessão confirmada',
    mensagem: 'Presença confirmada. Se precisar cancelar, entre em contato com a clínica.',
    cor: 'var(--color-status-confirmada-text)',
    fundo: 'var(--color-status-confirmada-bg)',
    borda: 'var(--color-status-confirmada-border)',
  },
  ja_confirmado: {
    emoji: '✅',
    titulo: 'Sessão já confirmada',
    mensagem: 'Esta sessão já foi confirmada anteriormente. Para cancelar, entre em contato com a clínica.',
    cor: 'var(--color-status-confirmada-text)',
    fundo: 'var(--color-status-confirmada-bg)',
    borda: 'var(--color-status-confirmada-border)',
  },
  ja_cancelado: {
    emoji: '❌',
    titulo: 'Sessão já cancelada',
    mensagem: 'Esta sessão já foi cancelada. Se precisar remarcar, entre em contato com a clínica.',
    cor: 'var(--color-status-cancelada-text)',
    fundo: 'var(--color-status-cancelada-bg)',
    borda: 'var(--color-status-cancelada-border)',
  },
  cancelado: {
    emoji: '❌',
    titulo: 'Sessão cancelada',
    mensagem: 'Sessão cancelada com sucesso. A equipe já foi avisada. Entre em contato se precisar remarcar.',
    cor: 'var(--color-status-cancelada-text)',
    fundo: 'var(--color-status-cancelada-bg)',
    borda: 'var(--color-status-cancelada-border)',
  },
  expirado: {
    emoji: '⚠️',
    titulo: 'Link expirado',
    mensagem: 'O prazo para responder encerrou. A sessão foi confirmada automaticamente e será cobrada normalmente.',
    cor: 'var(--color-amber-main)',
    fundo: 'var(--color-amber-light)',
    borda: 'var(--color-amber-border)',
  },
  nao_encontrado: {
    emoji: '🔍',
    titulo: 'Link inválido',
    mensagem: 'Este link não existe ou já foi utilizado. Entre em contato com a clínica.',
    cor: 'var(--color-status-expirada-text)',
    fundo: 'var(--color-status-expirada-bg)',
    borda: 'var(--color-status-expirada-border)',
  },
}

export function CartaoSessao({
  emoji,
  titulo,
  cor,
  fundo,
  borda,
  sessao,
  children,
}: {
  emoji: string
  titulo: string
  cor: string
  fundo: string
  borda: string
  sessao?: DadosSessao
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'var(--color-cream)' }}>
      <div
        className="max-w-sm w-full rounded-2xl p-8 text-center space-y-4"
        style={{ background: fundo, border: `1.5px solid ${borda}`, boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}
      >
        <div className="text-5xl">{emoji}</div>

        <h1 className="text-xl font-semibold" style={{ color: cor, fontFamily: 'var(--font-lora)' }}>
          {titulo}
        </h1>

        {sessao && (
          <div
            className="rounded-xl p-4 text-sm space-y-1"
            style={{ background: 'rgba(255,255,255,0.7)', color: 'var(--color-ink-mid)' }}
          >
            <div className="font-semibold" style={{ color: 'var(--color-ink)' }}>{sessao.paciente}</div>
            <div className="capitalize">{sessao.data}</div>
            <div className="font-medium">{sessao.hora}</div>
          </div>
        )}

        {children}

        <div className="pt-2">
          <div className="text-xs" style={{ color: 'var(--color-ink-faint)' }}>
            Alicerce — Espaço Terapêutico
          </div>
        </div>
      </div>
    </div>
  )
}

export function ResultadoSessao({ resultado, sessao }: { resultado: TipoResultado; sessao?: DadosSessao }) {
  const c = configs[resultado]
  return (
    <CartaoSessao emoji={c.emoji} titulo={c.titulo} cor={c.cor} fundo={c.fundo} borda={c.borda} sessao={sessao}>
      <p className="text-sm" style={{ color: 'var(--color-ink-soft)' }}>{c.mensagem}</p>
    </CartaoSessao>
  )
}
