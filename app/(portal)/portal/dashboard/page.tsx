import { createClient } from '@/lib/supabase/server'
import { Card } from '@/components/ui/Card'
import { ComunicadoCard } from '@/components/ui/ComunicadoCard'
import { OrientacaoCard } from '@/components/portal/OrientacaoCard'
import { CalendarioMensalPortal } from '@/components/portal/CalendarioMensalPortal'
import { gerarSessoes } from '@/lib/agenda/sessoes'

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

  const [{ data: comunicados }, { data: agendamentos }, { data: feriados }, { data: orientacoes }, { data: relatoriosRecentes }] = await Promise.all([
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
      .select('data, descricao')
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
  ])

  // Gera sessões recorrentes para os próximos 3 meses (para o calendário)
  const pacientesAtivos = (vinculos ?? [])
    .map((v: any) => v.pacientes)
    .filter((p: any) => p && p.status === 'ativo')

  const agora = new Date()
  const em3meses = new Date(agora.getFullYear(), agora.getMonth() + 3, agora.getDate())
  const inicio3meses = new Date(agora.getFullYear(), agora.getMonth() - 1, 1)
  const feriadosDatas = (feriados ?? []).map((f: any) => f.data)

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

      {/* Orientações recentes dos terapeutas */}
      {(orientacoes ?? []).length > 0 && (
        <div>
          <h2
            className="text-xs font-semibold uppercase tracking-wider mb-3"
            style={{ color: 'var(--color-ink-soft)' }}
          >
            Orientações dos terapeutas
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

            {(feriados ?? []).filter((f: any) => f.data >= new Date().toISOString().slice(0, 10)).slice(0, 3).map((f: any) => (
              <div
                key={f.data}
                className="flex items-center gap-3 rounded-xl px-4 py-3"
                style={{ background: '#FEF9F0', border: '1px solid #FDEBD0' }}
              >
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: '#F0A030' }} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium" style={{ color: '#92400E' }}>{f.descricao}</div>
                  <div className="text-xs" style={{ color: '#B45309' }}>
                    {new Date(f.data + 'T12:00:00').toLocaleDateString('pt-BR', {
                      weekday: 'long', day: '2-digit', month: 'long',
                    })} · Feriado
                  </div>
                </div>
              </div>
            ))}
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

      {/* Calendário mensal */}
      <CalendarioMensalPortal eventos={eventosCalendario} />
    </div>
  )
}
