import Link from 'next/link'
import type { LinhaDoPainel } from '@/lib/qualidade-dados/responsaveis'

/**
 * Dados de contato para a recepção conferir. Só contagem e link: a home fica numa mesa de
 * atendimento, visível de fora, então nenhum telefone aparece aqui (o detalhe vive nas listas).
 * Sem nenhuma linha o painel inteiro some.
 */
export function PainelQualidadeDados({ linhas }: { linhas: LinhaDoPainel[] }) {
  if (linhas.length === 0) return null
  return (
    <section
      aria-label="Dados para conferir"
      className="rounded-2xl px-5 py-4"
      style={{ background: 'var(--color-amber-light)', border: '1px solid var(--color-amber-border)' }}
    >
      <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--color-amber-deep)' }}>
        Dados para conferir
      </h2>
      <ul className="space-y-2">
        {linhas.map(linha => (
          <li key={linha.chave} className="flex items-center justify-between gap-3">
            {/* A contagem já abre o texto ("18 responsáveis…"): sem selo repetindo o número. */}
            <span className="text-sm min-w-0" style={{ color: 'var(--color-amber-deep)' }}>{linha.texto}</span>
            <Link
              href={linha.href}
              className="text-xs font-medium rounded-lg px-3 py-2 min-h-[44px] flex items-center transition-colors flex-shrink-0"
              style={{ color: 'var(--color-amber-deep)', border: '1px solid var(--color-amber-main)', background: 'transparent' }}
            >
              Ver
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
