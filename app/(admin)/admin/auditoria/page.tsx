import { createAdminClient } from '@/lib/supabase/admin'
import { getPerfilPermissoesAtual } from '@/lib/permissoes/verificar'
import { Card } from '@/components/ui/Card'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

const acaoLabel: Record<string, string> = {
  visualizou: 'Visualizou',
  enviou:     'Enviou',
  alterou:    'Alterou',
  assinou:    'Assinou',
  baixou:     'Baixou',
  criou:      'Criou',
  publicou:   'Publicou',
  desativou:  'Desativou',
  reativou:   'Reativou',
  bloqueou:   'Bloqueou',
  solicitou:  'Solicitou',
  confirmou:  'Confirmou',
  recusou:    'Recusou',
}

const acaoStyle: Record<string, { background: string; color: string }> = {
  visualizou: { background: 'var(--color-lavender-light)', color: 'var(--color-lavender-main)' },
  enviou:     { background: 'var(--color-sage-light)',     color: 'var(--color-sage-deep)' },
  alterou:    { background: '#FFFBEB', color: '#92400E' },
  assinou:    { background: 'var(--color-lavender-light)', color: 'var(--color-lavender-main)' },
  baixou:     { background: 'var(--color-rose-blush)',     color: 'var(--color-rose-deep)' },
  criou:      { background: 'var(--color-sage-light)',     color: 'var(--color-sage-deep)' },
  publicou:   { background: 'var(--color-sage-light)',     color: 'var(--color-sage-deep)' },
  desativou:  { background: '#FEF2F2', color: '#B91C1C' },
  reativou:   { background: 'var(--color-sage-light)',     color: 'var(--color-sage-deep)' },
  bloqueou:   { background: '#FEF2F2', color: '#B91C1C' },
  solicitou:  { background: '#FFFBEB', color: '#92400E' },
  confirmou:  { background: 'var(--color-sage-light)',     color: 'var(--color-sage-deep)' },
  recusou:    { background: '#FEF2F2', color: '#B91C1C' },
}

const recursoLabel: Record<string, string> = {
  paciente:    'paciente',
  relatorio:   'relatório',
  documento:   'documento',
  usuario:     'usuário',
  permissao:   'permissão',
  alta:        'alta',
  agendamento: 'agendamento',
  comunicado:  'comunicado',
}

export default async function AuditoriaPage() {
  const perfil = await getPerfilPermissoesAtual()
  if (!perfil?.efetivas.ver_auditoria) notFound()

  const supabase = createAdminClient()

  const { data: logs } = await supabase
    .from('audit_logs')
    .select('id, acao, recurso_tipo, recurso_id, criado_em, profiles(nome)')
    .order('criado_em', { ascending: false })
    .limit(200)

  const logsFiltrados = (logs ?? []).filter((log: any) =>
    !(log.acao === 'visualizou' && log.recurso_tipo === 'paciente')
  )

  return (
    <div className="space-y-6">
      <div>
        <h1
          className="text-2xl font-semibold"
          style={{ fontFamily: 'var(--font-lora)', color: 'var(--color-ink)' }}
        >
          Auditoria
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--color-ink-soft)' }}>
          Registro de ações dos usuários
        </p>
      </div>

      <Card>
        {logsFiltrados.length > 0 ? (
          <ul className="divide-y" style={{ borderColor: 'var(--color-border-soft)' }}>
            {logsFiltrados.map((log: any) => (
              <li key={log.id} className="py-3 flex items-start gap-3 first:pt-0 last:pb-0">
                <span
                  className="mt-0.5 text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0"
                  style={acaoStyle[log.acao] ?? { background: 'var(--color-border-soft)', color: 'var(--color-ink-mid)' }}
                >
                  {acaoLabel[log.acao] ?? log.acao}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm" style={{ color: 'var(--color-ink-mid)' }}>
                    <span className="font-medium" style={{ color: 'var(--color-ink)' }}>
                      {log.profiles?.nome ?? '—'}
                    </span>
                    {' '}
                    {acaoLabel[log.acao]?.toLowerCase() ?? log.acao}
                    {' '}
                    {recursoLabel[log.recurso_tipo] ?? log.recurso_tipo}
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: 'var(--color-ink-faint)' }}>
                    {new Date(log.criado_em).toLocaleString('pt-BR', {
                      day: '2-digit', month: '2-digit', year: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm" style={{ color: 'var(--color-ink-faint)' }}>
            Nenhuma ação relevante registrada ainda.
          </p>
        )}
      </Card>
    </div>
  )
}
