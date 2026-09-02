'use client'

import { Card } from '@/components/ui/Card'
import {
  FiltroEvolucoes,
  autoriaEvolucao,
  useFiltroEvolucoes,
  type AutorEvolucao,
} from './filtro-evolucoes'

export interface EvolucaoPortal extends AutorEvolucao {
  id: string
  identificacao: string | null
  conclusao: string | null
  publicado_em: string | null
  pdf_url: string | null
}

interface Props {
  pacienteId: string
  evolucoes: EvolucaoPortal[]
}

export function ListaEvolucoesPortal({ pacienteId, evolucoes }: Props) {
  const filtro = useFiltroEvolucoes(evolucoes)

  if (evolucoes.length === 0) {
    return (
      <Card>
        <p className="text-sm" style={{ color: 'var(--color-ink-faint)' }}>
          Nenhuma evolução disponível ainda.
        </p>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      {filtro.mostrarFiltro && (
        <FiltroEvolucoes
          profissionais={filtro.profissionais}
          tipos={filtro.tipos}
          profSel={filtro.profSel}
          tipoSel={filtro.tipoSel}
          onAlternarProf={filtro.alternarProf}
          onAlternarTipo={filtro.alternarTipo}
          onLimparProf={filtro.limparProf}
          onLimparTipo={filtro.limparTipo}
        />
      )}

      {filtro.evolucoesFiltradas.length === 0 ? (
        <Card>
          <p className="text-sm" style={{ color: 'var(--color-ink-faint)' }}>
            Nenhuma evolução para esse filtro.
          </p>
        </Card>
      ) : (
        filtro.evolucoesFiltradas.map(e => {
          const autoria = autoriaEvolucao(e)
          return (
            <Card key={e.id}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="font-medium" style={{ color: 'var(--color-ink)' }}>
                    {e.identificacao ?? 'Evolução clínica'}
                  </div>
                  {autoria && (
                    <div className="text-xs mt-0.5" style={{ color: 'var(--color-sage-deep)' }}>
                      {autoria}
                    </div>
                  )}
                  {e.conclusao && (
                    <p className="text-sm mt-1 line-clamp-2" style={{ color: 'var(--color-ink-mid)' }}>
                      {e.conclusao}
                    </p>
                  )}
                  <div className="text-xs mt-2" style={{ color: 'var(--color-ink-faint)' }}>
                    {e.publicado_em
                      ? new Date(e.publicado_em).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
                      : ''}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <a
                    href={`/portal/paciente/${pacienteId}/evolucao/${e.id}`}
                    className="text-sm font-medium transition-opacity hover:opacity-70"
                    style={{ color: 'var(--color-rose-main)' }}
                  >
                    Ver
                  </a>
                  {e.pdf_url && (
                    <a
                      href={e.pdf_url.startsWith('http') ? e.pdf_url : `/api/evolucao/${e.id}/pdf`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
                      style={{ background: 'var(--color-rose-blush)', color: 'var(--color-rose-deep)' }}
                    >
                      PDF
                    </a>
                  )}
                </div>
              </div>
            </Card>
          )
        })
      )}
    </div>
  )
}
