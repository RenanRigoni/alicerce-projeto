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
      id, status, tipo, motivo, documento_url, criado_em, confirmado_em,
      pacientes(id, nome),
      confirmado_por_profile:profiles!solicitacoes_alta_confirmado_por_fkey(nome)
    `)
    .eq('id', id)
    .single()

  if (!s) notFound()

  const statusLabel: Record<string, string> = {
    registrada:            'Registrada',
    pendente_confirmacao:  'Aguardando confirmação',
    confirmada:            'Confirmada',
    pendente:              'Pendente',
    aprovada:              'Aprovada',
    recusada:              'Recusada',
  }

  const statusStyle: Record<string, React.CSSProperties> = {
    registrada:           { background: 'var(--color-sage-light)', color: 'var(--color-sage-deep)' },
    pendente_confirmacao: { background: 'var(--color-amber-light)', color: 'var(--color-amber-deep)' },
    confirmada:           { background: 'var(--color-sage-light)', color: 'var(--color-sage-deep)' },
    pendente:             { background: 'var(--color-amber-light)', color: 'var(--color-amber-deep)' },
    aprovada:             { background: 'var(--color-sage-light)', color: 'var(--color-sage-deep)' },
    recusada:             { background: '#FEF2F2', color: '#B91C1C' },
  }

  const tipoLabel: Record<string, string> = {
    terapeuta:   'Registrada pela profissional',
    responsavel: 'Solicitada pela família',
  }

  const paciente = s.pacientes as any
  const confirmadoPor = (s.confirmado_por_profile as any)?.nome

  return (
    <div className="space-y-6 max-w-xl">
      <div className="flex items-center gap-3 flex-wrap">
        <a
          href={`/terapia/paciente/${paciente?.id}`}
          className="text-sm transition-colors hover:opacity-70"
          style={{ color: 'var(--color-ink-soft)' }}
        >
          ← Voltar ao paciente
        </a>
        <h1
          className="text-2xl font-semibold flex-1"
          style={{ fontFamily: 'var(--font-lora)', color: 'var(--color-ink)' }}
        >
          Alta do paciente
        </h1>
        <span
          className="text-xs px-2.5 py-1 rounded-full font-medium"
          style={statusStyle[s.status] ?? {}}
        >
          {statusLabel[s.status] ?? s.status}
        </span>
      </div>

      <Card>
        <div className="space-y-1">
          <div className="font-semibold text-lg" style={{ fontFamily: 'var(--font-lora)', color: 'var(--color-ink)' }}>
            {paciente?.nome}
          </div>
          <div className="text-xs" style={{ color: 'var(--color-ink-faint)' }}>
            {s.tipo ? tipoLabel[s.tipo] ?? s.tipo : ''}
            {' · '}
            {new Date(s.criado_em).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
          </div>
        </div>
      </Card>

      {s.motivo && (
        <Card>
          <div
            className="text-xs font-bold uppercase tracking-wide mb-2"
            style={{ color: 'var(--color-sage-main)' }}
          >
            {s.tipo === 'responsavel' ? 'Justificativa da família' : 'Justificativa clínica'}
          </div>
          <p className="text-sm whitespace-pre-wrap leading-relaxed" style={{ color: 'var(--color-ink-mid)' }}>
            {s.motivo}
          </p>
        </Card>
      )}

      {s.documento_url && (
        <Card>
          <div
            className="text-xs font-bold uppercase tracking-wide mb-2"
            style={{ color: 'var(--color-sage-main)' }}
          >
            Documento anexado
          </div>
          <a
            href={`/api/alta/${s.id}/documento`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm underline transition-opacity hover:opacity-70"
            style={{ color: 'var(--color-rose-main)' }}
          >
            Abrir documento →
          </a>
        </Card>
      )}

      {(s.status === 'confirmada' || s.status === 'registrada') && (
        <Card>
          <div
            className="text-xs font-bold uppercase tracking-wide mb-2"
            style={{ color: 'var(--color-sage-main)' }}
          >
            Alta concluída
          </div>
          <p className="text-sm" style={{ color: 'var(--color-ink-mid)' }}>
            {s.status === 'confirmada' && confirmadoPor
              ? `Confirmada por ${confirmadoPor}`
              : 'Alta registrada pela profissional responsável.'}
            {s.confirmado_em && (
              <> Em {new Date(s.confirmado_em).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}.</>
            )}
          </p>
        </Card>
      )}

      {s.status === 'pendente_confirmacao' && (
        <Card>
          <div
            className="text-xs font-bold uppercase tracking-wide mb-2"
            style={{ color: 'var(--color-amber-deep)' }}
          >
            Aguardando confirmação
          </div>
          <p className="text-sm" style={{ color: 'var(--color-ink-mid)' }}>
            A família solicitou a alta. Acesse o prontuário do paciente para confirmar ou continuar o acompanhamento.
          </p>
          <a
            href={`/terapia/paciente/${paciente?.id}`}
            className="inline-block mt-3 text-sm font-medium underline transition-opacity hover:opacity-70"
            style={{ color: 'var(--color-rose-main)' }}
          >
            Ir ao prontuário →
          </a>
        </Card>
      )}
    </div>
  )
}
