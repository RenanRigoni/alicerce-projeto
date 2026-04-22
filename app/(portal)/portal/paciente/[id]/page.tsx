import { createClient } from '@/lib/supabase/server'
import { Card } from '@/components/ui/Card'
import { notFound } from 'next/navigation'
import { registrarAcao } from '@/lib/audit/registrar-acao'

const tipoLabel: Record<string, string> = {
  sessao: 'Sessão', devolutiva: 'Devolutiva', reuniao: 'Reunião', outro: 'Outro',
}

const orientacaoTipoLabel: Record<string, string> = {
  texto: 'Orientação', video: 'Vídeo', pdf: 'PDF', imagem: 'Imagem', guia: 'Guia',
}

export default async function PacientePortalPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ aba?: string }>
}) {
  const { id } = await params
  const { aba = 'relatorios' } = await searchParams

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: paciente } = await supabase
    .from('pacientes')
    .select('id, nome, frequencia_atendimento, horarios_atendimento')
    .eq('id', id)
    .single()

  if (!paciente) notFound()

  await registrarAcao('visualizou', 'paciente', id)

  const [
    { data: relatorios },
    { data: documentos },
    { data: orientacoes },
    { data: agendamentos },
    { data: feriados },
  ] = await Promise.all([
    supabase
      .from('relatorios')
      .select('id, identificacao, status, publicado_em, conclusao')
      .eq('paciente_id', id)
      .eq('status', 'publicado')
      .order('publicado_em', { ascending: false }),
    supabase
      .from('documentos')
      .select('id, tipo, descricao, criado_em, arquivo_url')
      .eq('paciente_id', id)
      .eq('visivel_pais', true)
      .order('criado_em', { ascending: false }),
    supabase
      .from('orientacoes')
      .select('id, titulo, tipo, url_midia, conteudo, criado_em')
      .eq('paciente_id', id)
      .order('criado_em', { ascending: false }),
    supabase
      .from('agendamentos')
      .select('id, tipo, titulo, data_hora, duracao_minutos')
      .eq('paciente_id', id)
      .eq('visivel_responsavel', true)
      .gte('data_hora', new Date().toISOString())
      .order('data_hora', { ascending: true })
      .limit(20),
    supabase
      .from('feriados')
      .select('data, descricao')
      .gte('data', new Date().toISOString().slice(0, 10))
      .order('data')
      .limit(10),
  ])

  const abas = [
    { key: 'relatorios',  label: 'Relatórios',  count: relatorios?.length ?? 0 },
    { key: 'documentos',  label: 'Documentos',  count: documentos?.length ?? 0 },
    { key: 'orientacoes', label: 'Orientações', count: orientacoes?.length ?? 0 },
    { key: 'agenda',      label: 'Agenda',      count: agendamentos?.length ?? 0 },
    { key: 'historico',   label: 'Histórico',   count: null },
  ]

  const historico = [
    ...(relatorios ?? []).map(r => ({
      tipo: 'relatorio' as const, id: r.id,
      titulo: r.identificacao ?? 'Relatório', data: r.publicado_em ?? '',
    })),
    ...(documentos ?? []).map(d => ({
      tipo: 'documento' as const, id: d.id,
      titulo: d.descricao ?? d.tipo, data: d.criado_em,
    })),
    ...(orientacoes ?? []).map(o => ({
      tipo: 'orientacao' as const, id: o.id,
      titulo: o.titulo, data: o.criado_em,
    })),
  ].sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <a
          href="/portal/dashboard"
          className="text-sm transition-colors hover:opacity-70"
          style={{ color: 'var(--color-ink-soft)' }}
        >
          ← Voltar
        </a>
        <h1
          className="text-2xl font-semibold"
          style={{ fontFamily: 'var(--font-lora)', color: 'var(--color-ink)' }}
        >
          {paciente.nome}
        </h1>
      </div>

      {paciente.frequencia_atendimento && (
        <p className="text-sm" style={{ color: 'var(--color-ink-soft)' }}>
          {paciente.frequencia_atendimento}
        </p>
      )}

      {/* Abas */}
      <div
        className="flex gap-0.5 border-b overflow-x-auto pb-0"
        style={{ borderColor: 'var(--color-border)' }}
      >
        {abas.map(a => (
          <a
            key={a.key}
            href={`/portal/paciente/${id}?aba=${a.key}`}
            className="px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px"
            style={{
              borderColor: aba === a.key ? 'var(--color-peach-main)' : 'transparent',
              color: aba === a.key ? 'var(--color-peach-main)' : 'var(--color-ink-soft)',
            }}
          >
            {a.label}
            {a.count != null && a.count > 0 && (
              <span
                className="ml-1.5 text-xs px-1.5 py-0.5 rounded-full"
                style={{ background: 'var(--color-peach-light)', color: 'var(--color-peach-main)' }}
              >
                {a.count}
              </span>
            )}
          </a>
        ))}
      </div>

      {/* ── Relatórios ── */}
      {aba === 'relatorios' && (
        <div className="space-y-3">
          {relatorios && relatorios.length > 0 ? relatorios.map(r => (
            <Card key={r.id}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="font-medium" style={{ color: 'var(--color-ink)' }}>
                    {r.identificacao ?? 'Relatório de avaliação'}
                  </div>
                  {r.conclusao && (
                    <p className="text-sm mt-1 line-clamp-2" style={{ color: 'var(--color-ink-mid)' }}>
                      {r.conclusao}
                    </p>
                  )}
                  <div className="text-xs mt-2" style={{ color: 'var(--color-ink-faint)' }}>
                    {r.publicado_em
                      ? new Date(r.publicado_em).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
                      : ''}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <a
                    href={`/portal/paciente/${id}/relatorio/${r.id}`}
                    className="text-sm font-medium transition-opacity hover:opacity-70"
                    style={{ color: 'var(--color-rose-main)' }}
                  >
                    Ver
                  </a>
                  <a
                    href={`/api/relatorio/${r.id}/pdf`}
                    className="text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
                    style={{ background: 'var(--color-rose-blush)', color: 'var(--color-rose-deep)' }}
                  >
                    PDF
                  </a>
                </div>
              </div>
            </Card>
          )) : (
            <Card>
              <p className="text-sm" style={{ color: 'var(--color-ink-faint)' }}>
                Nenhum relatório disponível ainda.
              </p>
            </Card>
          )}
        </div>
      )}

      {/* ── Documentos ── */}
      {aba === 'documentos' && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <a
              href={`/portal/paciente/${id}/upload`}
              className="text-sm font-medium px-4 py-2 rounded-xl transition-all duration-200"
              style={{ background: 'var(--color-peach-light)', color: 'var(--color-peach-main)' }}
            >
              + Enviar arquivo
            </a>
          </div>
          {documentos && documentos.length > 0 ? documentos.map(d => (
            <Card key={d.id}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium capitalize" style={{ color: 'var(--color-ink)' }}>
                    {d.tipo}
                  </div>
                  <div className="text-sm" style={{ color: 'var(--color-ink-mid)' }}>
                    {d.descricao ?? '—'}
                  </div>
                  <div className="text-xs mt-1" style={{ color: 'var(--color-ink-faint)' }}>
                    {new Date(d.criado_em).toLocaleDateString('pt-BR')}
                  </div>
                </div>
                <a
                  href={d.arquivo_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium transition-opacity hover:opacity-70"
                  style={{ color: 'var(--color-rose-main)' }}
                >
                  Abrir
                </a>
              </div>
            </Card>
          )) : (
            <Card>
              <p className="text-sm" style={{ color: 'var(--color-ink-faint)' }}>
                Nenhum documento disponível.
              </p>
            </Card>
          )}
        </div>
      )}

      {/* ── Orientações ── */}
      {aba === 'orientacoes' && (
        <div className="space-y-3">
          {orientacoes && orientacoes.length > 0 ? (orientacoes as any[]).map(o => (
            <Card key={o.id}>
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="font-medium" style={{ color: 'var(--color-ink)' }}>{o.titulo}</div>
                {o.tipo && (
                  <span
                    className="text-xs px-2 py-0.5 rounded-full flex-shrink-0"
                    style={{ background: 'var(--color-peach-light)', color: 'var(--color-peach-main)' }}
                  >
                    {orientacaoTipoLabel[o.tipo] ?? o.tipo}
                  </span>
                )}
              </div>
              {o.tipo === 'video' && o.url_midia ? (
                <a
                  href={o.url_midia}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-medium transition-opacity hover:opacity-70"
                  style={{ color: 'var(--color-rose-main)' }}
                >
                  ▶ Assistir vídeo
                </a>
              ) : (o.tipo === 'pdf' || o.tipo === 'imagem') && o.url_midia ? (
                <a
                  href={o.url_midia}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-medium transition-opacity hover:opacity-70"
                  style={{ color: 'var(--color-rose-main)' }}
                >
                  {o.tipo === 'pdf' ? '📄 Abrir PDF' : '🖼 Ver imagem'}
                </a>
              ) : null}
              {o.conteudo && (
                <p className="text-sm whitespace-pre-wrap mt-1" style={{ color: 'var(--color-ink-mid)' }}>
                  {o.conteudo}
                </p>
              )}
              <div className="text-xs mt-2" style={{ color: 'var(--color-ink-faint)' }}>
                {new Date(o.criado_em).toLocaleDateString('pt-BR')}
              </div>
            </Card>
          )) : (
            <Card>
              <p className="text-sm" style={{ color: 'var(--color-ink-faint)' }}>
                Nenhuma orientação disponível.
              </p>
            </Card>
          )}
        </div>
      )}

      {/* ── Agenda ── */}
      {aba === 'agenda' && (
        <div className="space-y-3">
          {feriados && feriados.length > 0 && (
            <div className="space-y-2">
              <h3
                className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: 'var(--color-ink-soft)' }}
              >
                Feriados próximos
              </h3>
              {feriados.map(f => (
                <div
                  key={f.data}
                  className="flex items-center gap-3 rounded-xl px-4 py-3"
                  style={{ background: '#FEF9F0', border: '1px solid #FDEBD0' }}
                >
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: '#F0A030' }} />
                  <div>
                    <div className="text-sm font-medium" style={{ color: '#92400E' }}>{f.descricao}</div>
                    <div className="text-xs" style={{ color: '#B45309' }}>
                      {new Date(f.data + 'T12:00:00').toLocaleDateString('pt-BR', {
                        weekday: 'long', day: '2-digit', month: 'long',
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {agendamentos && agendamentos.length > 0 ? (
            <div className="space-y-2">
              <h3
                className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: 'var(--color-ink-soft)' }}
              >
                Próximos atendimentos
              </h3>
              {agendamentos.map(a => (
                <div
                  key={a.id}
                  className="flex items-center gap-3 rounded-xl px-4 py-3"
                  style={{
                    background: 'var(--color-warm-white)',
                    border: '1px solid var(--color-border)',
                  }}
                >
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: 'var(--color-peach-main)' }}
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium" style={{ color: 'var(--color-ink)' }}>
                      {tipoLabel[a.tipo] ?? a.tipo}
                    </div>
                    <div className="text-xs" style={{ color: 'var(--color-ink-soft)' }}>
                      {new Date(a.data_hora).toLocaleDateString('pt-BR', {
                        weekday: 'long', day: '2-digit', month: 'long',
                      })} · {new Date(a.data_hora).toLocaleTimeString('pt-BR', {
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </div>
                  </div>
                  <div className="text-xs flex-shrink-0" style={{ color: 'var(--color-ink-faint)' }}>
                    {a.duracao_minutos} min
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Card>
              <p className="text-sm" style={{ color: 'var(--color-ink-faint)' }}>
                Nenhum agendamento futuro.
              </p>
            </Card>
          )}
        </div>
      )}

      {/* ── Histórico ── */}
      {aba === 'historico' && (
        <div className="space-y-1">
          {historico.length > 0 ? historico.map((item, i) => (
            <div
              key={i}
              className="flex items-start gap-3 py-3 border-b"
              style={{ borderColor: 'var(--color-border-soft)' }}
            >
              <div
                className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                style={{
                  background: item.tipo === 'relatorio'
                    ? 'var(--color-rose-soft)'
                    : item.tipo === 'documento'
                    ? 'var(--color-lavender-main)'
                    : 'var(--color-sage-main)',
                }}
              />
              <div className="flex-1">
                <div className="text-sm" style={{ color: 'var(--color-ink-mid)' }}>{item.titulo}</div>
                <div className="text-xs mt-0.5" style={{ color: 'var(--color-ink-faint)' }}>
                  {item.tipo === 'relatorio' ? 'Relatório' :
                   item.tipo === 'documento' ? 'Documento' : 'Orientação'}
                  {' · '}
                  {item.data ? new Date(item.data).toLocaleDateString('pt-BR') : ''}
                </div>
              </div>
            </div>
          )) : (
            <Card>
              <p className="text-sm" style={{ color: 'var(--color-ink-faint)' }}>
                Nenhuma atividade registrada.
              </p>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
