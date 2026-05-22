import { createClient } from '@/lib/supabase/server'
import { Card } from '@/components/ui/Card'
import { notFound } from 'next/navigation'
import { registrarAcao } from '@/lib/audit/registrar-acao'
import { OrientacaoCard } from '@/components/portal/OrientacaoCard'
import { SolicitarAltaPortal } from '@/components/portal/SolicitarAltaPortal'

const tipoLabel: Record<string, string> = {
  sessao: 'Sessão', devolutiva: 'Devolutiva', reuniao: 'Reunião', reposicao: 'Reposição', bloqueio: 'Indisponível', outro: 'Outro',
}

export default async function PacientePortalPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ aba?: string }>
}) {
  const { id } = await params
  const { aba = 'geral' } = await searchParams

  const supabase = await createClient()
  const { data: paciente } = await supabase
    .from('pacientes')
    .select('id, nome, frequencia_atendimento, horarios_atendimento, data_nascimento, sexo, status, data_inicio, turno_preferencia, convenio_ou_particular')
    .eq('id', id)
    .single()

  if (!paciente) notFound()

  await registrarAcao('visualizou', 'paciente', id)

  const [
    { data: relatorios },
    { data: evolucoes },
    { data: documentos },
    { data: orientacoes },
    { data: agendamentos },
    { data: feriados },
    { data: terapeutas },
    { data: dadosClinicos },
    { data: altaPendente },
  ] = await Promise.all([
    supabase
      .from('relatorios')
      .select('id, identificacao, status, publicado_em, conclusao, pdf_url')
      .eq('paciente_id', id)
      .eq('status', 'publicado')
      .order('publicado_em', { ascending: false }),
    supabase
      .from('evolucoes')
      .select('id, identificacao, status, publicado_em, conclusao, pdf_url')
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
    supabase
      .from('paciente_terapeutas')
      .select('terapeuta:profiles!terapeuta_id(id, nome, foto_url)')
      .eq('paciente_id', id),
    supabase
      .from('pacientes_dados_clinicos')
      .select('hipotese_diagnostica, diagnostico, objetivos_terapeuticos, plano_terapeutico, obs_clinicas_gerais')
      .eq('paciente_id', id)
      .maybeSingle(),
    supabase
      .from('solicitacoes_alta')
      .select('id')
      .eq('paciente_id', id)
      .eq('status', 'pendente_confirmacao')
      .maybeSingle(),
  ])

  const abas = [
    { key: 'geral',       label: 'Geral',       count: null },
    { key: 'relatorios',  label: 'Relatórios',  count: relatorios?.length ?? 0 },
    { key: 'evolucoes',   label: 'Evolução',    count: evolucoes?.length ?? 0 },
    { key: 'orientacoes', label: 'Orientações',  count: orientacoes?.length ?? 0 },
    { key: 'documentos',  label: 'Documentos',  count: documentos?.length ?? 0 },
    { key: 'agenda',      label: 'Agenda',      count: agendamentos?.length ?? 0 },
    { key: 'historico',   label: 'Histórico',   count: null },
  ]

  const historico = [
    ...(relatorios ?? []).map(r => ({
      tipo: 'relatorio' as const, id: r.id,
      titulo: r.identificacao ?? 'Relatório', data: r.publicado_em ?? '',
      href: `/portal/paciente/${id}/relatorio/${r.id}`,
    })),
    ...(evolucoes ?? []).map(e => ({
      tipo: 'evolucao' as const, id: e.id,
      titulo: e.identificacao ?? 'Evolução', data: e.publicado_em ?? '',
      href: `/portal/paciente/${id}/evolucao/${e.id}`,
    })),
    ...(documentos ?? []).map(d => ({
      tipo: 'documento' as const, id: d.id,
      titulo: d.descricao ?? d.tipo, data: d.criado_em,
      href: `/api/documento/${d.id}/download`,
    })),
    ...(orientacoes ?? []).map(o => ({
      tipo: 'orientacao' as const, id: o.id,
      titulo: o.titulo, data: o.criado_em,
      href: o.url_midia ?? null,
    })),
  ].sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())

  type TerapeutaInfo = { id: string; nome: string; fotoUrl: string | null }
  const terapeutasDados: TerapeutaInfo[] = (terapeutas ?? [])
    .map((v: any) => v.terapeuta)
    .filter(Boolean)
    .map((p: any) => ({ id: p.id, nome: p.nome ?? '', fotoUrl: p.foto_url ?? null }))

  const diasLabel: Record<string, string> = {
    segunda: 'Segunda', terca: 'Terça', quarta: 'Quarta', quinta: 'Quinta', sexta: 'Sexta', sabado: 'Sábado',
  }

  const turnoLabel: Record<string, string> = {
  manha: 'Manhã',
  tarde: 'Tarde',
  qualquer: 'Qualquer',
}

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <a href="/portal/dashboard" className="text-sm transition-colors hover:opacity-70" style={{ color: 'var(--color-ink-soft)' }}>
          ← Voltar
        </a>
        <h1 className="text-2xl font-semibold" style={{ fontFamily: 'var(--font-lora)', color: 'var(--color-ink)' }}>
          {paciente.nome}
        </h1>
      </div>

      {/* Abas */}
      <div className="flex gap-0.5 border-b overflow-x-auto pb-0" style={{ borderColor: 'var(--color-border)' }}>
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

      {/* ── Geral ── */}
      {aba === 'geral' && (
        <div className="space-y-4">
          <Card>
            <div className="grid grid-cols-2 gap-4">
              {paciente.data_nascimento && (
                <div>
                  <div className="text-xs uppercase tracking-wide mb-0.5" style={{ color: 'var(--color-ink-faint)' }}>Nascimento</div>
                  <div className="text-sm" style={{ color: 'var(--color-ink)' }}>
                    {new Date(paciente.data_nascimento).toLocaleDateString('pt-BR')}
                  </div>
                </div>
              )}
              {paciente.frequencia_atendimento && (
                <div>
                  <div className="text-xs uppercase tracking-wide mb-0.5" style={{ color: 'var(--color-ink-faint)' }}>Frequência</div>
                  <div className="text-sm" style={{ color: 'var(--color-ink)' }}>{paciente.frequencia_atendimento}</div>
                </div>
              )}
              {paciente.convenio_ou_particular && (
                <div>
                  <div className="text-xs uppercase tracking-wide mb-0.5" style={{ color: 'var(--color-ink-faint)' }}>Tipo</div>
                  <div className="text-sm" style={{ color: 'var(--color-ink)' }}>
                    {paciente.convenio_ou_particular === 'convenio' ? 'Convênio' : 'Particular'}
                  </div>
                </div>
              )}
              {paciente.turno_preferencia && (
                <div>
                  <div className="text-xs uppercase tracking-wide mb-0.5" style={{ color: 'var(--color-ink-faint)' }}>Turno</div>
                  <div className="text-sm" style={{ color: 'var(--color-ink)' }}>
                    {turnoLabel[String(paciente.turno_preferencia)] ?? paciente.turno_preferencia}
                  </div>
                </div>
              )}
            </div>

            {(paciente.horarios_atendimento as any[])?.length > 0 && (
              <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--color-border-soft)' }}>
                <div className="text-xs uppercase tracking-wide mb-2" style={{ color: 'var(--color-ink-faint)' }}>Horários</div>
                <div className="flex flex-wrap gap-2">
                  {(paciente.horarios_atendimento as any[]).map((h: any, i: number) => (
                    <span
                      key={i}
                      className="text-sm px-3 py-1 rounded-full"
                      style={{ background: 'var(--color-peach-light)', color: 'var(--color-peach-main)' }}
                    >
                      {diasLabel[h.dia] ?? h.dia} · {h.hora}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {terapeutasDados.length > 0 && (
              <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--color-border-soft)' }}>
                <div className="text-xs uppercase tracking-wide mb-2" style={{ color: 'var(--color-ink-faint)' }}>Profissionais</div>
                <div className="flex flex-wrap gap-2">
                  {terapeutasDados.map(t => {
                    const ini = t.nome.split(' ').slice(0, 2).map((n: string) => n[0]).join('').toUpperCase()
                    return (
                      <div
                        key={t.id}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-full"
                        style={{ background: 'var(--color-sage-light)', color: 'var(--color-sage-deep)' }}
                      >
                        <div
                          className="w-5 h-5 rounded-full overflow-hidden flex items-center justify-center text-xs font-semibold flex-shrink-0"
                          style={{ background: 'var(--color-sage-soft)', color: 'var(--color-sage-deep)' }}
                        >
                          {t.fotoUrl
                            // eslint-disable-next-line @next/next/no-img-element
                            ? <img src={t.fotoUrl} alt={t.nome} loading="lazy" className="w-full h-full object-cover" />
                            : ini}
                        </div>
                        <span className="text-sm">{t.nome}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </Card>

          {dadosClinicos && (dadosClinicos.hipotese_diagnostica || dadosClinicos.diagnostico || dadosClinicos.objetivos_terapeuticos || dadosClinicos.obs_clinicas_gerais) && (
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--color-ink-soft)' }}>
                Informações clínicas
              </h2>
              <Card>
                <div className="space-y-4">
                  {dadosClinicos.hipotese_diagnostica && (
                    <div>
                      <div className="text-xs uppercase tracking-wide mb-0.5" style={{ color: 'var(--color-ink-faint)' }}>Hipótese diagnóstica</div>
                      <p className="text-sm" style={{ color: 'var(--color-ink-mid)' }}>{dadosClinicos.hipotese_diagnostica}</p>
                    </div>
                  )}
                  {dadosClinicos.diagnostico && (
                    <div>
                      <div className="text-xs uppercase tracking-wide mb-0.5" style={{ color: 'var(--color-ink-faint)' }}>Diagnóstico</div>
                      <p className="text-sm" style={{ color: 'var(--color-ink-mid)' }}>{dadosClinicos.diagnostico}</p>
                    </div>
                  )}
                  {dadosClinicos.objetivos_terapeuticos && (
                    <div>
                      <div className="text-xs uppercase tracking-wide mb-0.5" style={{ color: 'var(--color-ink-faint)' }}>Objetivos terapêuticos</div>
                      <p className="text-sm" style={{ color: 'var(--color-ink-mid)' }}>{dadosClinicos.objetivos_terapeuticos}</p>
                    </div>
                  )}
                  {dadosClinicos.obs_clinicas_gerais && (
                    <div>
                      <div className="text-xs uppercase tracking-wide mb-0.5" style={{ color: 'var(--color-ink-faint)' }}>Observações gerais</div>
                      <p className="text-sm" style={{ color: 'var(--color-ink-mid)' }}>{dadosClinicos.obs_clinicas_gerais}</p>
                    </div>
                  )}
                </div>
              </Card>
            </div>
          )}

          {paciente.status === 'ativo' && !altaPendente && (
            <div className="flex justify-end pt-2">
              <SolicitarAltaPortal pacienteId={id} pacienteNome={paciente.nome} />
            </div>
          )}

          {altaPendente && (
            <div
              className="rounded-xl px-4 py-3 text-sm"
              style={{ background: '#FFFBEB', border: '1px solid #FDE68A', color: '#92400E' }}
            >
              Sua solicitação de alta foi enviada e aguarda confirmação da profissional.
            </div>
          )}
        </div>
      )}

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
                  {r.pdf_url && (
                    <a
                      href={r.pdf_url.startsWith('http') ? r.pdf_url : `/api/relatorio/${r.id}/pdf`}
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
          )) : (
            <Card>
              <p className="text-sm" style={{ color: 'var(--color-ink-faint)' }}>
                Nenhum relatório disponível ainda.
              </p>
            </Card>
          )}
        </div>
      )}

      {/* ── Evolução ── */}
      {aba === 'evolucoes' && (
        <div className="space-y-3">
          {evolucoes && evolucoes.length > 0 ? evolucoes.map(e => (
            <Card key={e.id}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="font-medium" style={{ color: 'var(--color-ink)' }}>
                    {e.identificacao ?? 'Evolução clínica'}
                  </div>
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
                    href={`/portal/paciente/${id}/evolucao/${e.id}`}
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
          )) : (
            <Card>
              <p className="text-sm" style={{ color: 'var(--color-ink-faint)' }}>
                Nenhuma evolução disponível ainda.
              </p>
            </Card>
          )}
        </div>
      )}

      {/* ── Orientações ── */}
      {aba === 'orientacoes' && (
        <div className="space-y-3">
          {orientacoes && orientacoes.length > 0 ? (orientacoes as any[]).map(o => (
            <OrientacaoCard key={o.id} o={o} />
          )) : (
            <Card>
              <p className="text-sm" style={{ color: 'var(--color-ink-faint)' }}>
                Nenhuma orientação disponível.
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
                  <div className="font-medium capitalize" style={{ color: 'var(--color-ink)' }}>{d.tipo}</div>
                  <div className="text-sm" style={{ color: 'var(--color-ink-mid)' }}>{d.descricao ?? '—'}</div>
                  <div className="text-xs mt-1" style={{ color: 'var(--color-ink-faint)' }}>
                    {new Date(d.criado_em).toLocaleDateString('pt-BR')}
                  </div>
                </div>
                <a href={`/api/documento/${d.id}/download`} target="_blank" rel="noopener noreferrer"
                  className="text-sm font-medium transition-opacity hover:opacity-70"
                  style={{ color: 'var(--color-rose-main)' }}>
                  Abrir
                </a>
              </div>
            </Card>
          )) : (
            <Card>
              <p className="text-sm" style={{ color: 'var(--color-ink-faint)' }}>Nenhum documento disponível.</p>
            </Card>
          )}
        </div>
      )}

      {/* ── Agenda ── */}
      {aba === 'agenda' && (
        <div className="space-y-3">
          {feriados && feriados.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-ink-soft)' }}>
                Feriados próximos
              </h3>
              {feriados.map(f => (
                <div key={f.data} className="flex items-center gap-3 rounded-xl px-4 py-3"
                  style={{ background: '#FEF9F0', border: '1px solid #FDEBD0' }}>
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: '#F0A030' }} />
                  <div>
                    <div className="text-sm font-medium" style={{ color: '#92400E' }}>{f.descricao}</div>
                    <div className="text-xs" style={{ color: '#B45309' }}>
                      {new Date(f.data + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {agendamentos && agendamentos.length > 0 ? (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-ink-soft)' }}>
                Próximos atendimentos
              </h3>
              {agendamentos.map(a => (
                <div key={a.id} className="flex items-center gap-3 rounded-xl px-4 py-3"
                  style={{ background: 'var(--color-warm-white)', border: '1px solid var(--color-border)' }}>
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: 'var(--color-peach-main)' }} />
                  <div className="flex-1">
                    <div className="text-sm font-medium" style={{ color: 'var(--color-ink)' }}>
                      {tipoLabel[a.tipo] ?? a.tipo}
                    </div>
                    <div className="text-xs" style={{ color: 'var(--color-ink-soft)' }}>
                      {new Date(a.data_hora).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
                      {' · '}{new Date(a.data_hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
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
              <p className="text-sm" style={{ color: 'var(--color-ink-faint)' }}>Nenhum agendamento futuro.</p>
            </Card>
          )}
        </div>
      )}

      {/* ── Histórico ── */}
      {aba === 'historico' && (
        <div className="space-y-1">
          {historico.length > 0 ? historico.map((item, i) => (
            <a
              key={i}
              href={item.href ?? '#'}
              target={item.tipo === 'documento' ? '_blank' : undefined}
              rel={item.tipo === 'documento' ? 'noopener noreferrer' : undefined}
              className="flex items-start gap-3 py-3 border-b transition-colors hover:bg-[var(--color-border-soft)] rounded-lg px-2 -mx-2"
              style={{ borderColor: 'var(--color-border-soft)' }}
            >
              <div
                className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                style={{
                  background: item.tipo === 'relatorio'
                    ? 'var(--color-rose-soft)'
                    : item.tipo === 'evolucao'
                    ? 'var(--color-sage-main)'
                    : item.tipo === 'documento'
                    ? 'var(--color-lavender-main)'
                    : 'var(--color-sage-main)',
                }}
              />
              <div className="flex-1">
                <div className="text-sm" style={{ color: 'var(--color-ink-mid)' }}>{item.titulo}</div>
                <div className="text-xs mt-0.5" style={{ color: 'var(--color-ink-faint)' }}>
                  {item.tipo === 'relatorio' ? 'Relatório' :
                   item.tipo === 'evolucao' ? 'Evolução' :
                   item.tipo === 'documento' ? 'Documento' : 'Orientação'}
                  {' · '}
                  {item.data ? new Date(item.data).toLocaleDateString('pt-BR') : ''}
                </div>
              </div>
              <span className="text-xs flex-shrink-0" style={{ color: 'var(--color-rose-main)' }}>Ver →</span>
            </a>
          )) : (
            <Card>
              <p className="text-sm" style={{ color: 'var(--color-ink-faint)' }}>Nenhuma atividade registrada.</p>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
