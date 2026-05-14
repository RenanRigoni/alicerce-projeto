import { createClient } from '@/lib/supabase/server'
import { Card } from '@/components/ui/Card'
import { getPerfilPermissoesAtual } from '@/lib/permissoes/verificar'
import { notFound } from 'next/navigation'

const statusLabel: Record<string, string> = {
  registrada:           'Registrada',
  pendente_confirmacao: 'Aguardando confirmação',
  confirmada:           'Confirmada',
  aprovada:             'Aprovada',
  recusada:             'Recusada',
  pendente:             'Pendente',
}

const statusStyle: Record<string, React.CSSProperties> = {
  registrada:           { background: 'var(--color-sage-light)', color: 'var(--color-sage-deep)' },
  pendente_confirmacao: { background: '#FFFBEB', color: '#92400E' },
  confirmada:           { background: 'var(--color-sage-light)', color: 'var(--color-sage-deep)' },
  aprovada:             { background: 'var(--color-sage-light)', color: 'var(--color-sage-deep)' },
  recusada:             { background: '#FEF2F2', color: '#B91C1C' },
  pendente:             { background: '#FFFBEB', color: '#92400E' },
}

export default async function AltaPage() {
  const perfil = await getPerfilPermissoesAtual()
  if (!perfil?.efetivas.registrar_alta) notFound()

  const supabase = await createClient()

  const { data: altas } = await supabase
    .from('solicitacoes_alta')
    .select(`
      id, status, tipo, motivo, documento_url, argumentacao_recusa,
      criado_em, decidido_em, confirmado_em,
      pacientes(id, nome),
      profiles!solicitacoes_alta_solicitado_por_fkey(nome)
    `)
    .order('criado_em', { ascending: false })
    .limit(50)

  const aguardando = (altas ?? []).filter((a: any) => a.status === 'pendente_confirmacao')
  const historico  = (altas ?? []).filter((a: any) => a.status !== 'pendente_confirmacao')

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1
          className="text-2xl font-semibold"
          style={{ fontFamily: 'var(--font-lora)', color: 'var(--color-ink)' }}
        >
          Altas de pacientes
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--color-ink-soft)' }}>
          Visão geral das altas registradas e solicitações em andamento.
        </p>
      </div>

      {/* Aguardando confirmação da profissional */}
      {aguardando.length > 0 && (
        <div className="space-y-3">
          <h2
            className="text-xs font-semibold uppercase tracking-wider flex items-center gap-2"
            style={{ color: 'var(--color-ink-soft)' }}
          >
            Aguardando confirmação da profissional
            <span
              className="text-xs px-2 py-0.5 rounded-full font-semibold"
              style={{ background: '#FFFBEB', color: '#92400E' }}
            >
              {aguardando.length}
            </span>
          </h2>
          {aguardando.map((s: any) => (
            <AltaCard key={s.id} s={s} />
          ))}
        </div>
      )}

      {/* Histórico */}
      <div className="space-y-3">
        <h2
          className="text-xs font-semibold uppercase tracking-wider"
          style={{ color: 'var(--color-ink-soft)' }}
        >
          Histórico
        </h2>
        {historico.length > 0 ? historico.map((s: any) => (
          <AltaCard key={s.id} s={s} />
        )) : (
          <Card>
            <p className="text-sm" style={{ color: 'var(--color-ink-faint)' }}>
              Nenhuma alta registrada.
            </p>
          </Card>
        )}
      </div>
    </div>
  )
}

function AltaCard({ s }: { s: any }) {
  const tipoLabel = s.tipo === 'responsavel' ? 'Solicitada pelo responsável' : 'Registrada pela profissional'
  const dataRef = s.confirmado_em ?? s.decidido_em ?? s.criado_em

  return (
    <Card>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex-1">
          <div className="font-semibold" style={{ color: 'var(--color-ink)' }}>
            {s.pacientes?.nome}
          </div>
          <div className="text-xs mt-0.5" style={{ color: 'var(--color-ink-faint)' }}>
            {tipoLabel} · {s.profiles?.nome} · {new Date(dataRef).toLocaleDateString('pt-BR')}
          </div>
          {s.motivo && (
            <p className="text-sm mt-2 whitespace-pre-wrap" style={{ color: 'var(--color-ink-mid)' }}>
              {s.motivo.slice(0, 200)}{s.motivo.length > 200 ? '…' : ''}
            </p>
          )}
          {s.documento_url && (
            <a
              href={`/api/alta/${s.id}/documento`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs mt-1.5 inline-block font-medium transition-opacity hover:opacity-70"
              style={{ color: 'var(--color-rose-main)' }}
            >
              Ver documento médico →
            </a>
          )}
        </div>
        <span
          className="text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0"
          style={statusStyle[s.status] ?? { background: 'var(--color-border-soft)', color: 'var(--color-ink-mid)' }}
        >
          {statusLabel[s.status] ?? s.status}
        </span>
      </div>
    </Card>
  )
}
