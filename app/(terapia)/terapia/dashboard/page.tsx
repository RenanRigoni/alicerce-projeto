import { createClient } from '@/lib/supabase/server'
import { Card } from '@/components/ui/Card'
import { gerarSessoes } from '@/lib/agenda/sessoes'

const tipoLabel: Record<string, string> = {
  sessao: 'Sessão', devolutiva: 'Devolutiva', reuniao: 'Reunião', outro: 'Outro',
}

export default async function TerapiaDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [
    { data: vinculos },
    { data: especiais },
    { data: feriados },
    { data: comunicados },
  ] = await Promise.all([
    supabase
      .from('paciente_terapeutas')
      .select('paciente_id, pacientes(id, nome, foto_url, status, frequencia_atendimento, horarios_atendimento)')
      .eq('terapeuta_id', user!.id),
    supabase
      .from('agendamentos')
      .select('id, tipo, titulo, data_hora, duracao_minutos, pacientes(nome)')
      .eq('terapeuta_id', user!.id)
      .neq('tipo', 'sessao')
      .gte('data_hora', new Date().toISOString())
      .order('data_hora')
      .limit(10),
    supabase
      .from('feriados')
      .select('data, descricao')
      .gte('data', new Date().toISOString().slice(0, 10))
      .order('data')
      .limit(3),
    supabase
      .from('comunicados')
      .select('id, titulo, conteudo, criado_em')
      .order('criado_em', { ascending: false })
      .limit(3),
  ])

  const pacientesAtivos = (vinculos ?? []).filter((v: any) => v.pacientes?.status === 'ativo')

  // Próximas sessões recorrentes (próximos 30 dias)
  const pacientesComHorario = pacientesAtivos.map((v: any) => v.pacientes).filter(Boolean)
  const agora = new Date()
  const em30dias = new Date(agora.getTime() + 30 * 24 * 60 * 60 * 1000)
  const feriadosDatas = (feriados ?? []).map((f: any) => f.data)

  const sessoesProximas = gerarSessoes(pacientesComHorario, agora, em30dias, feriadosDatas)

  // Merge sessões recorrentes + especiais, ordena, pega 5 primeiros
  const proximosCompromissos = [
    ...sessoesProximas,
    ...(especiais ?? []).map((a: any) => ({
      id: a.id,
      tipo: a.tipo,
      titulo: a.titulo,
      motivo: null,
      data_hora: a.data_hora,
      duracao_minutos: a.duracao_minutos,
      paciente: a.pacientes ? { id: '', nome: a.pacientes.nome } : null,
    })),
  ]
    .sort((a, b) => a.data_hora.localeCompare(b.data_hora))
    .slice(0, 5)

  return (
    <div className="space-y-6">
      <div>
        <h1
          className="text-2xl font-semibold"
          style={{ fontFamily: 'var(--font-lora)', color: 'var(--color-ink)' }}
        >
          Minha agenda
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--color-ink-soft)' }}>
          Seus próximos compromissos e pacientes
        </p>
      </div>

      {/* Próximos compromissos */}
      {proximosCompromissos.length > 0 && (
        <div>
          <h2
            className="text-xs font-semibold uppercase tracking-wider mb-3"
            style={{ color: 'var(--color-ink-soft)' }}
          >
            Próximos compromissos
          </h2>
          <div className="space-y-2">
            {proximosCompromissos.map((a) => (
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
                  style={{ background: 'var(--color-sage-soft)' }}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate" style={{ color: 'var(--color-ink)' }}>
                    {tipoLabel[a.tipo] ?? a.tipo}
                    {a.paciente?.nome && (
                      <span style={{ color: 'var(--color-ink-soft)', fontWeight: 400 }}>
                        {' · '}{a.paciente.nome}
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
          </div>
        </div>
      )}

      {/* Meus pacientes */}
      <div>
        <h2
          className="text-xs font-semibold uppercase tracking-wider mb-3"
          style={{ color: 'var(--color-ink-soft)' }}
        >
          Meus pacientes
        </h2>
        {pacientesAtivos.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {pacientesAtivos.map((p: any) => (
              <a key={p.paciente_id} href={`/terapia/paciente/${p.paciente_id}`}>
                <Card className="hover:shadow-md transition-all duration-200 cursor-pointer group">
                  <div className="font-medium" style={{ color: 'var(--color-ink)' }}>
                    {p.pacientes?.nome}
                  </div>
                  {p.pacientes?.frequencia_atendimento && (
                    <div className="text-xs mt-1" style={{ color: 'var(--color-ink-soft)' }}>
                      {p.pacientes.frequencia_atendimento}
                    </div>
                  )}
                  <div
                    className="text-xs mt-2 font-medium group-hover:underline"
                    style={{ color: 'var(--color-sage-main)' }}
                  >
                    Ver perfil →
                  </div>
                </Card>
              </a>
            ))}
          </div>
        ) : (
          <Card>
            <p className="text-sm" style={{ color: 'var(--color-ink-faint)' }}>
              Nenhum paciente ativo vinculado.
            </p>
          </Card>
        )}
      </div>

      {/* Próximos feriados */}
      {(feriados ?? []).length > 0 && (
        <Card>
          <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--color-ink-mid)' }}>
            Próximos feriados
          </h2>
          <div className="space-y-2.5">
            {(feriados ?? []).map((f: any) => (
              <div key={f.data} className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: 'var(--color-rose-soft)' }} />
                <div>
                  <span className="text-sm font-medium" style={{ color: 'var(--color-ink)' }}>
                    {f.descricao}
                  </span>
                  <span className="text-xs ml-2" style={{ color: 'var(--color-ink-soft)' }}>
                    {new Date(f.data + 'T12:00:00').toLocaleDateString('pt-BR', {
                      weekday: 'long', day: '2-digit', month: 'long',
                    })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Comunicados */}
      {(comunicados ?? []).length > 0 && (
        <div>
          <h2
            className="text-xs font-semibold uppercase tracking-wider mb-3"
            style={{ color: 'var(--color-ink-soft)' }}
          >
            Comunicados da clínica
          </h2>
          <div className="space-y-3">
            {(comunicados ?? []).map((c: any) => (
              <Card key={c.id}>
                <div className="font-medium mb-1" style={{ color: 'var(--color-ink)' }}>{c.titulo}</div>
                <p className="text-sm line-clamp-2" style={{ color: 'var(--color-ink-mid)' }}>{c.conteudo}</p>
                <div className="text-xs mt-2" style={{ color: 'var(--color-ink-faint)' }}>
                  {new Date(c.criado_em).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
