import { createClient } from '@/lib/supabase/server'
import { Card } from '@/components/ui/Card'
import { notFound } from 'next/navigation'

export default async function AltaDetalheTerapeutaPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'terapeuta') notFound()

  const { data: s } = await supabase
    .from('solicitacoes_alta')
    .select(`
      id, status, motivo, argumentacao_recusa, criado_em, decidido_em,
      solicitado_por,
      pacientes(id, nome),
      profiles!solicitacoes_alta_decidido_por_fkey(nome)
    `)
    .eq('id', id)
    .eq('solicitado_por', user.id)
    .single()

  if (!s) notFound()

  const statusLabel: Record<string, string> = {
    pendente: 'Pendente',
    aprovada: 'Aprovada',
    recusada: 'Recusada',
  }

  const statusStyle: Record<string, React.CSSProperties> = {
    pendente: { background: '#FFFBEB', color: '#92400E' },
    aprovada: { background: 'var(--color-sage-light)', color: 'var(--color-sage-deep)' },
    recusada: { background: '#FEF2F2', color: '#B91C1C' },
  }

  return (
    <div className="space-y-6 max-w-xl">
      <div className="flex items-center gap-3 flex-wrap">
        <a
          href={`/terapia/paciente/${(s.pacientes as any)?.id}`}
          className="text-sm transition-colors hover:opacity-70"
          style={{ color: 'var(--color-ink-soft)' }}
        >
          ← Voltar ao paciente
        </a>
        <h1
          className="text-2xl font-semibold flex-1"
          style={{ fontFamily: 'var(--font-lora)', color: 'var(--color-ink)' }}
        >
          Solicitação de alta
        </h1>
        <span
          className="text-xs px-2.5 py-1 rounded-full font-medium"
          style={statusStyle[s.status] ?? {}}
        >
          {statusLabel[s.status] ?? s.status}
        </span>
      </div>

      {/* Cabeçalho */}
      <Card>
        <div className="space-y-1">
          <div className="font-semibold text-lg" style={{ fontFamily: 'var(--font-lora)', color: 'var(--color-ink)' }}>
            {(s.pacientes as any)?.nome}
          </div>
          <div className="text-xs" style={{ color: 'var(--color-ink-faint)' }}>
            Solicitada em {new Date(s.criado_em).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
          </div>
        </div>
      </Card>

      {/* Motivo da solicitação */}
      <Card>
        <div
          className="text-xs font-bold uppercase tracking-wide mb-2"
          style={{ color: 'var(--color-sage-main)' }}
        >
          Justificativa enviada
        </div>
        <p className="text-sm whitespace-pre-wrap leading-relaxed" style={{ color: 'var(--color-ink-mid)' }}>
          {s.motivo}
        </p>
      </Card>

      {/* Argumentação da recusa */}
      {s.status === 'recusada' && s.argumentacao_recusa && (
        <Card>
          <div
            className="text-xs font-bold uppercase tracking-wide mb-2"
            style={{ color: '#B91C1C' }}
          >
            Motivo da recusa
          </div>
          <p className="text-sm whitespace-pre-wrap leading-relaxed" style={{ color: 'var(--color-ink-mid)' }}>
            {s.argumentacao_recusa}
          </p>
          {s.decidido_em && (
            <div className="text-xs mt-3 pt-3 border-t" style={{ borderColor: 'var(--color-border-soft)', color: 'var(--color-ink-faint)' }}>
              Decidido por {(s.profiles as any)?.nome ?? 'Admin'} em{' '}
              {new Date(s.decidido_em).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
            </div>
          )}
        </Card>
      )}

      {s.status === 'aprovada' && (
        <Card>
          <div
            className="text-xs font-bold uppercase tracking-wide mb-2"
            style={{ color: 'var(--color-sage-main)' }}
          >
            Alta aprovada
          </div>
          <p className="text-sm" style={{ color: 'var(--color-ink-mid)' }}>
            A alta foi aprovada pela administração.
            {s.decidido_em && (
              <> Em {new Date(s.decidido_em).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}.</>
            )}
          </p>
        </Card>
      )}
    </div>
  )
}
