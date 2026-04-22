import { createClient } from '@/lib/supabase/server'
import { Card } from '@/components/ui/Card'
import { DecidirAltaButtons } from '@/components/admin/DecidirAltaButtons'

export default async function AltaPage() {
  const supabase = await createClient()

  const { data: pendentes } = await supabase
    .from('solicitacoes_alta')
    .select(`
      id, motivo, criado_em,
      pacientes(id, nome),
      profiles!solicitacoes_alta_solicitado_por_fkey(nome)
    `)
    .eq('status', 'pendente')
    .order('criado_em', { ascending: true })

  const { data: historico } = await supabase
    .from('solicitacoes_alta')
    .select(`
      id, status, motivo, argumentacao_recusa, criado_em, decidido_em,
      pacientes(nome),
      profiles!solicitacoes_alta_solicitado_por_fkey(nome)
    `)
    .neq('status', 'pendente')
    .order('decidido_em', { ascending: false })
    .limit(20)

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1
          className="text-2xl font-semibold"
          style={{ fontFamily: 'var(--font-lora)', color: 'var(--color-ink)' }}
        >
          Solicitações de alta
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--color-ink-soft)' }}>
          Analise e decida sobre as altas solicitadas pelos terapeutas
        </p>
      </div>

      {/* Pendentes */}
      <div className="space-y-3">
        <h2
          className="text-xs font-semibold uppercase tracking-wider flex items-center gap-2"
          style={{ color: 'var(--color-ink-soft)' }}
        >
          Pendentes
          {pendentes && pendentes.length > 0 && (
            <span
              className="text-xs px-2 py-0.5 rounded-full font-semibold"
              style={{ background: '#FFFBEB', color: '#92400E' }}
            >
              {pendentes.length}
            </span>
          )}
        </h2>

        {pendentes && pendentes.length > 0 ? pendentes.map((s: any) => (
          <Card key={s.id}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="font-semibold" style={{ color: 'var(--color-ink)' }}>
                  {s.pacientes?.nome}
                </div>
                <div className="text-xs mb-2" style={{ color: 'var(--color-ink-faint)' }}>
                  Solicitado por {s.profiles?.nome} · {new Date(s.criado_em).toLocaleDateString('pt-BR')}
                </div>
                <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--color-ink-mid)' }}>
                  {s.motivo}
                </p>
              </div>
              <DecidirAltaButtons solicitacaoId={s.id} pacienteNome={s.pacientes?.nome ?? ''} />
            </div>
          </Card>
        )) : (
          <Card>
            <p className="text-sm" style={{ color: 'var(--color-ink-faint)' }}>
              Nenhuma solicitação pendente.
            </p>
          </Card>
        )}
      </div>

      {/* Histórico */}
      {historico && historico.length > 0 && (
        <div className="space-y-3">
          <h2
            className="text-xs font-semibold uppercase tracking-wider"
            style={{ color: 'var(--color-ink-soft)' }}
          >
            Histórico
          </h2>
          {historico.map((s: any) => (
            <Card key={s.id}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="font-medium" style={{ color: 'var(--color-ink)' }}>
                    {s.pacientes?.nome}
                  </div>
                  <div className="text-xs mb-1" style={{ color: 'var(--color-ink-faint)' }}>
                    {s.profiles?.nome} · {new Date(s.criado_em).toLocaleDateString('pt-BR')}
                  </div>
                  <p className="text-sm" style={{ color: 'var(--color-ink-mid)' }}>{s.motivo}</p>
                  {s.argumentacao_recusa && (
                    <p className="text-sm mt-1 italic" style={{ color: '#B91C1C' }}>
                      Recusa: {s.argumentacao_recusa}
                    </p>
                  )}
                </div>
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0"
                  style={s.status === 'aprovada'
                    ? { background: 'var(--color-sage-light)', color: 'var(--color-sage-deep)' }
                    : { background: '#FEF2F2', color: '#B91C1C' }
                  }
                >
                  {s.status}
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
