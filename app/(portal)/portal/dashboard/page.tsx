import { createClient } from '@/lib/supabase/server'
import { Card } from '@/components/ui/Card'
import { ComunicadoCard } from '@/components/ui/ComunicadoCard'
import { OrientacaoCard } from '@/components/portal/OrientacaoCard'
import { CalendarioMensalPortal } from '@/components/portal/CalendarioMensalPortal'
import { gerarSessoes } from '@/lib/agenda/sessoes'
import { expandirFeriadosAnuais } from '@/lib/agenda/feriados'
import { CAMPANHAS } from '@/lib/campanhas-saude'

const tipoLabel: Record<string, string> = {
  sessao: 'Sessão', devolutiva: 'Devolutiva', reuniao: 'Reunião', outro: 'Outro',
}

export default async function PortalDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: vinculos } = await supabase
    .from('paciente_responsaveis')
    .select('paciente_id, pacientes(id, nome, foto_url, frequencia_atendimento, status, horarios_atendimento)')
    .eq('responsavel_id', user!.id)

  const pacienteIds = (vinculos ?? []).map((v: any) => v.paciente_id as string)

  const [{ data: comunicados }, { data: agendamentos }, { data: feriados }, { data: orientacoes }, { data: relatoriosRecentes }, { data: evolucoesRecentes }] = await Promise.all([
    supabase
      .from('comunicados')
      .select('id, titulo, conteudo, criado_em')
      .order('criado_em', { ascending: false })
      .limit(3),
    pacienteIds.length > 0
      ? supabase
          .from('agendamentos')
          .select('id, tipo, titulo, data_hora, duracao_minutos, pacientes(nome)')
          .in('paciente_id', pacienteIds)
          .eq('visivel_responsavel', true)
          .gte('data_hora', new Date().toISOString())
          .order('data_hora', { ascending: true })
          .limit(5)
      : Promise.resolve({ data: [] }),
    supabase
      .from('feriados')
      .select('data, descricao, anual')
      .order('data'),
    pacienteIds.length > 0
      ? supabase
          .from('orientacoes')
          .select('id, titulo, tipo, url_midia, conteudo, criado_em, paciente_id, pacientes(nome)')
          .in('paciente_id', pacienteIds)
          .order('criado_em', { ascending: false })
          .limit(5)
      : Promise.resolve({ data: [] }),
    pacienteIds.length > 0
      ? supabase
          .from('relatorios')
          .select('id, paciente_id, identificacao, conclusao, publicado_em, pdf_url, pacientes(nome)')
          .in('paciente_id', pacienteIds)
          .eq('status', 'publicado')
          .order('publicado_em', { ascending: false })
          .limit(5)
      : Promise.resolve({ data: [] }),
    pacienteIds.length > 0
      ? supabase
          .from('evolucoes')
          .select('id, paciente_id, identificacao, conclusao, publicado_em, pdf_url, pacientes(nome)')
          .in('paciente_id', pacienteIds)
          .eq('status', 'publicado')
          .order('publicado_em', { ascending: false })
          .limit(5)
      : Promise.resolve({ data: [] }),
  ])

  // Gera sessões recorrentes para os próximos 3 meses (para o calendário)
  const pacientesAtivos = (vinculos ?? [])
    .map((v: any) => v.pacientes)
    .filter((p: any) => p && p.status === 'ativo')

  const agora = new Date()
  const agoraBRT = new Date(agora.getTime() - 3 * 60 * 60 * 1000)
  const campanha = CAMPANHAS[agoraBRT.getUTCMonth()]

  const em3meses = new Date(agora.getFullYear(), agora.getMonth() + 3, agora.getDate())
  const inicio3meses = new Date(agora.getFullYear(), agora.getMonth() - 1, 1)
  const anoAtual = new Date().getFullYear()
  const feriadosDatas = expandirFeriadosAnuais(feriados ?? [], anoAtual - 1, anoAtual + 2)

  const sessoesRec = gerarSessoes(pacientesAtivos, inicio3meses, em3meses, feriadosDatas)

  // Monta eventos para o calendário
  const eventosCalendario = [
    ...sessoesRec.map(s => ({
      id: s.id,
      data: s.data_hora.slice(0, 10),
      hora: new Date(s.data_hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      titulo: s.paciente?.nome ?? 'Sessão',
      tipo: 'sessao' as const,
    })),
    ...(agendamentos ?? []).map((a: any) => ({
      id: a.id,
      data: a.data_hora.slice(0, 10),
      hora: new Date(a.data_hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      titulo: tipoLabel[a.tipo] ?? a.titulo,
      tipo: 'agendamento' as const,
      descricao: a.pacientes?.nome ?? undefined,
    })),
    ...(feriados ?? []).map((f: any) => ({
      id: `feriado-${f.data}`,
      data: f.data,
      hora: '',
      titulo: f.descricao,
      tipo: 'feriado' as const,
    })),
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1
          className="text-2xl font-semibold"
          style={{ fontFamily: 'var(--font-lora)', color: 'var(--color-ink)' }}
        >
          Acompanhamento
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--color-ink-soft)' }}>
          Acompanhe o progresso terapêutico do seu filho
        </p>
      </div>

      {/* Cartões dos filhos */}
      {vinculos && vinculos.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {vinculos.map((v: any) => (
            <a key={v.paciente_id} href={`/portal/paciente/${v.paciente_id}`}>
              <Card className="hover:shadow-md transition-all duration-200 cursor-pointer group">
                <div className="font-medium" style={{ color: 'var(--color-ink)' }}>{v.pacientes?.nome}</div>
                {v.pacientes?.frequencia_atendimento && (
                  <div className="text-xs mt-1" style={{ color: 'var(--color-ink-soft)' }}>
                    {v.pacientes.frequencia_atendimento}
                  </div>
                )}
                <div
                  className="text-xs mt-2 font-medium group-hover:underline"
                  style={{ color: 'var(--color-peach-main)' }}
                >
                  Ver acompanhamento →
                </div>
              </Card>
            </a>
          ))}
        </div>
      ) : (
        <Card>
          <p className="text-sm" style={{ color: 'var(--color-ink-faint)' }}>
            Nenhum paciente vinculado à sua conta ainda.
          </p>
        </Card>
      )}

      {/* Orientações recentes dos profissionais */}
      {(orientacoes ?? []).length > 0 && (
        <div>
          <h2
            className="text-xs font-semibold uppercase tracking-wider mb-3"
            style={{ color: 'var(--color-ink-soft)' }}
          >
            Orientações dos profissionais
          </h2>
          <div className="space-y-3">
            {(orientacoes ?? []).map((o: any) => (
              <OrientacaoCard key={o.id} o={o} />
            ))}
          </div>
        </div>
      )}

      {/* Próximos compromissos e feriados */}
      {((agendamentos ?? []).length > 0 || (feriados ?? []).length > 0) && (
        <div>
          <h2
            className="text-xs font-semibold uppercase tracking-wider mb-3"
            style={{ color: 'var(--color-ink-soft)' }}
          >
            Próximos compromissos
          </h2>
          <div className="space-y-2">
            {(agendamentos ?? []).map((a: any) => (
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
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate" style={{ color: 'var(--color-ink)' }}>
                    {tipoLabel[a.tipo] ?? a.tipo}
                    {a.pacientes?.nome && (
                      <span style={{ color: 'var(--color-ink-soft)', fontWeight: 400 }}>
                        {' · '}{a.pacientes.nome}
                      </span>
                    )}
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: 'var(--color-ink-soft)' }}>
                    {new Date(a.data_hora).toLocaleDateString('pt-BR', {
                      weekday: 'long', day: '2-digit', month: 'long',
                    })} · {new Date(a.data_hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                <div className="text-xs flex-shrink-0" style={{ color: 'var(--color-ink-faint)' }}>
                  {a.duracao_minutos} min
                </div>
              </div>
            ))}

            {(() => {
              const now = new Date()
              const todayStr = now.toISOString().slice(0, 10)
              const mesAtual = String(now.getMonth() + 1).padStart(2, '0')
              const anoAtual = now.getFullYear()
              const proxFeriado = (feriados ?? [])
                .flatMap((f: any) => {
                  const [, fMes, fDia] = (f.data as string).split('-')
                  if (fMes !== mesAtual) return []
                  const dataAnoAtual = `${anoAtual}-${fMes}-${fDia}`
                  if (dataAnoAtual < todayStr) return []
                  return [{ data: dataAnoAtual, descricao: f.descricao as string }]
                })
                .sort((a: { data: string }, b: { data: string }) => a.data.localeCompare(b.data))[0]
              if (!proxFeriado) return null
              return (
                <div
                  className="flex items-center gap-3 rounded-xl px-4 py-3"
                  style={{ background: '#FEF9F0', border: '1px solid #FDEBD0' }}
                >
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: '#F0A030' }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium" style={{ color: '#92400E' }}>{proxFeriado.descricao}</div>
                    <div className="text-xs" style={{ color: '#B45309' }}>
                      {new Date(proxFeriado.data + 'T12:00:00').toLocaleDateString('pt-BR', {
                        weekday: 'long', day: '2-digit', month: 'long',
                      })} · Feriado
                    </div>
                  </div>
                </div>
              )
            })()}
          </div>
        </div>
      )}

      {/* Relatórios recentes */}
      {relatoriosRecentes && relatoriosRecentes.length > 0 && (
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--color-ink-soft)' }}>
            Relatórios recentes
          </h2>
          <div className="space-y-2">
            {(relatoriosRecentes as any[]).map((r: any) => (
              <Card key={r.id} className="hover:shadow-md transition-all">
                <div className="flex items-start justify-between gap-3">
                  <a
                    href={`/portal/paciente/${r.paciente_id}/relatorio/${r.id}`}
                    className="flex-1 min-w-0"
                    style={{ textDecoration: 'none' }}
                  >
                    <div className="font-medium" style={{ color: 'var(--color-ink)' }}>
                      {r.identificacao ?? 'Relatório de avaliação'}
                      {pacienteIds.length > 1 && r.pacientes?.nome && (
                        <span className="ml-1.5 text-sm font-normal" style={{ color: 'var(--color-ink-soft)' }}>
                          — {r.pacientes.nome}
                        </span>
                      )}
                    </div>
                    {r.conclusao && (
                      <p className="text-sm mt-0.5 line-clamp-2" style={{ color: 'var(--color-ink-mid)' }}>
                        {r.conclusao}
                      </p>
                    )}
                    <div className="text-xs mt-1" style={{ color: 'var(--color-ink-faint)' }}>
                      {r.publicado_em ? new Date(r.publicado_em).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }) : ''}
                    </div>
                  </a>
                  {r.pdf_url && (
                    <a
                      href={r.pdf_url.startsWith('http') ? r.pdf_url : `/api/relatorio/${r.id}/pdf`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-medium px-2.5 py-1.5 rounded-lg flex-shrink-0"
                      style={{ background: 'var(--color-rose-blush)', color: 'var(--color-rose-deep)' }}
                    >
                      PDF
                    </a>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Evolucoes recentes */}
      {evolucoesRecentes && evolucoesRecentes.length > 0 && (
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--color-ink-soft)' }}>
            Evoluções recentes
          </h2>
          <div className="space-y-2">
            {(evolucoesRecentes as any[]).map((e: any) => (
              <Card key={e.id} className="hover:shadow-md transition-all">
                <div className="flex items-start justify-between gap-3">
                  <a
                    href={`/portal/paciente/${e.paciente_id}/evolucao/${e.id}`}
                    className="flex-1 min-w-0"
                    style={{ textDecoration: 'none' }}
                  >
                    <div className="font-medium" style={{ color: 'var(--color-ink)' }}>
                      {e.identificacao ?? 'Evolução clínica'}
                      {pacienteIds.length > 1 && e.pacientes?.nome && (
                        <span className="ml-1.5 text-sm font-normal" style={{ color: 'var(--color-ink-soft)' }}>
                          — {e.pacientes.nome}
                        </span>
                      )}
                    </div>
                    {e.conclusao && (
                      <p className="text-sm mt-0.5 line-clamp-2" style={{ color: 'var(--color-ink-mid)' }}>
                        {e.conclusao}
                      </p>
                    )}
                    <div className="text-xs mt-1" style={{ color: 'var(--color-ink-faint)' }}>
                      {e.publicado_em ? new Date(e.publicado_em).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }) : ''}
                    </div>
                  </a>
                  {e.pdf_url && (
                    <a
                      href={e.pdf_url.startsWith('http') ? e.pdf_url : `/api/evolucao/${e.id}/pdf`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-medium px-2.5 py-1.5 rounded-lg flex-shrink-0"
                      style={{ background: 'var(--color-rose-blush)', color: 'var(--color-rose-deep)' }}
                    >
                      PDF
                    </a>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Comunicados */}
      {comunicados && comunicados.length > 0 && (
        <div>
          <h2
            className="text-xs font-semibold uppercase tracking-wider mb-3"
            style={{ color: 'var(--color-ink-soft)' }}
          >
            Comunicados da clínica
          </h2>
          <div className="space-y-3">
            {comunicados.map((c: any) => (
              <ComunicadoCard
                key={c.id}
                titulo={c.titulo}
                conteudo={c.conteudo}
                criado_em={c.criado_em}
              />
            ))}
          </div>
        </div>
      )}

      {/* Campanha do mês */}
      <div>
        <h2
          className="text-xs font-semibold uppercase tracking-wider mb-3"
          style={{ color: 'var(--color-ink-soft)' }}
        >
          Campanha do mês
        </h2>
        <div
          className="rounded-2xl px-5 py-4 flex items-center gap-4"
          style={{ background: campanha.bg, border: `1px solid ${campanha.border}` }}
        >
          <div
            className="w-4 h-4 rounded-full flex-shrink-0"
            style={{ background: campanha.cor, boxShadow: `0 0 0 5px ${campanha.bg}` }}
          />
          <div>
            <div className="text-sm font-bold" style={{ color: campanha.cor }}>{campanha.titulo}</div>
            <div className="text-xs mt-0.5" style={{ color: campanha.cor, opacity: 0.8 }}>{campanha.descricao}</div>
          </div>
        </div>
      </div>

      {/* Calendário mensal */}
      <CalendarioMensalPortal eventos={eventosCalendario} />
    </div>
  )
}
