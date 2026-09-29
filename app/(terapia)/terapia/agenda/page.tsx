import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { CalendarioAgenda, type EventoAgenda } from '@/components/terapia/CalendarioAgenda'
import { gerarSessoes } from '@/lib/agenda/sessoes'
import { datasFeriadosParaBloqueio } from '@/lib/agenda/feriados'
import { temPermissao } from '@/lib/permissoes/definicoes'

/** Mesma sessão vista de duas origens: instante + paciente identificam. */
function chaveSessao(pacienteId: string, dataHora: string) {
  return `${pacienteId}|${new Date(dataHora).toISOString()}`
}

export default async function AgendaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, permissoes')
    .eq('id', user!.id)
    .single()

  const permissoes = (profile?.permissoes ?? {}) as Record<string, boolean>
  const podeMontarAgenda = temPermissao(profile?.role ?? '', permissoes, 'criar_agendamentos')
  const podeVerTodosPacientes = temPermissao(profile?.role ?? '', permissoes, 'ver_todos_pacientes')

  const inicio = new Date(); inicio.setMonth(inicio.getMonth() - 3); inicio.setHours(0, 0, 0, 0)
  const fim = new Date(); fim.setMonth(fim.getMonth() + 9); fim.setHours(23, 59, 59, 999)

  const [
    { data: vinculos },
    { data: agendamentos },
    { data: feriados },
    { data: configAgenda },
    { data: confirmacoes },
  ] = await Promise.all([
    supabase
      .from('paciente_terapeutas')
      .select('horarios_atendimento, pacientes(id, nome, status)')
      .eq('terapeuta_id', user!.id),
    // Inclui tipo 'sessao': agendamentos avulsos ficavam invisíveis na agenda
    supabase
      .from('agendamentos')
      .select('id, tipo, titulo, motivo, data_hora, duracao_minutos, pacientes(id, nome)')
      .eq('terapeuta_id', user!.id)
      .order('data_hora'),
    supabase
      .from('feriados')
      .select('data, descricao, anual')
      .order('data'),
    supabase
      .from('configuracoes_clinica')
      .select('bloquear_feriados')
      .eq('singleton', 'default')
      .maybeSingle(),
    supabase
      .from('sessao_confirmacoes')
      .select('paciente_id, data_hora, token, status')
      .gte('data_hora', inicio.toISOString())
      .lte('data_hora', fim.toISOString()),
  ])

  const pacientes = (vinculos ?? [])
    .map((v: any) => ({ ...v.pacientes, horarios_atendimento: v.horarios_atendimento ?? [] }))
    .filter((p: any) => p && p.status === 'ativo')

  // Lista do seletor de agendamento — segue a mesma regra de ver_todos_pacientes
  let pacientesAgendaveis: Array<{ id: string; nome: string }> = []
  if (podeMontarAgenda) {
    if (podeVerTodosPacientes) {
      const { data } = await createAdminClient()
        .from('pacientes')
        .select('id, nome')
        .eq('status', 'ativo')
        .order('nome')
      pacientesAgendaveis = data ?? []
    } else {
      pacientesAgendaveis = pacientes
        .map((p: any) => ({ id: p.id, nome: p.nome }))
        .sort((a, b) => a.nome.localeCompare(b.nome))
    }
  }

  const anoAtual = new Date().getFullYear()
  const feriadosDatas = datasFeriadosParaBloqueio(
    feriados ?? [],
    anoAtual - 1,
    anoAtual + 2,
    configAgenda?.bloquear_feriados === true,
  )
  const sessoesRec = gerarSessoes(pacientes, inicio, fim, feriadosDatas)

  // Monta mapa de confirmações: "paciente_id_YYYY-MM-DD_HH:MM" → { token, status }
  const confirmacaoMap = new Map<string, { token: string; status: string }>()
  for (const c of confirmacoes ?? []) {
    // data_hora vem do DB como UTC; sessões usam BRT (-03:00)
    // BRT = UTC - 3h → subtraindo 3h e usando métodos UTC chegamos ao horário BRT
    const dt = new Date(c.data_hora as string)
    const brt = new Date(dt.getTime() - 3 * 60 * 60 * 1000)
    const brtDate = brt.toISOString().slice(0, 10)
    const brtHora = brt.toISOString().slice(11, 16)
    confirmacaoMap.set(`${c.paciente_id}_${brtDate}_${brtHora}`, {
      token: c.token as string,
      status: c.status as string,
    })
  }

  // Linha gravada vence a sessão projetada: é ela que dá para abrir e remover
  const avulsosPorChave = new Map<string, any>()
  for (const a of (agendamentos ?? []) as any[]) {
    if (a.tipo !== 'sessao' || !a.pacientes?.id) continue
    const chave = chaveSessao(a.pacientes.id, a.data_hora)
    if (!avulsosPorChave.has(chave)) avulsosPorChave.set(chave, a)
  }
  const idsAvulsosMantidos = new Set([...avulsosPorChave.values()].map(a => a.id))

  const eventosList: EventoAgenda[] = [
    ...sessoesRec
      .filter(s => !s.paciente || !avulsosPorChave.has(chaveSessao(s.paciente.id, s.data_hora)))
      .map(s => {
        const brtDate = s.data_hora.slice(0, 10)
        const brtHora = s.data_hora.slice(11, 16)
        const confirmacao = s.paciente
          ? (confirmacaoMap.get(`${s.paciente.id}_${brtDate}_${brtHora}`) ?? null)
          : null
        return { ...s, confirmacao, origem: 'recorrente' as const }
      }),
    ...((agendamentos ?? []) as any[])
      // Duplicatas de 'sessao' no mesmo horário viram uma só
      .filter(a => a.tipo !== 'sessao' || idsAvulsosMantidos.has(a.id))
      .map(a => ({
        id: a.id as string,
        tipo: a.tipo as string,
        titulo: a.titulo as string,
        motivo: a.motivo as string | null,
        data_hora: a.data_hora as string,
        duracao_minutos: a.duracao_minutos as number,
        paciente: a.pacientes ? { id: a.pacientes.id, nome: a.pacientes.nome } : null,
        confirmacao: null,
        origem: 'agendamento' as const,
      })),
  ]

  const feriadosList = (feriados ?? []).map((f: any) => ({
    data: f.data as string,
    descricao: f.descricao as string,
  }))

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
          {podeMontarAgenda
            ? 'Toque num horário vago para agendar, ou num atendimento para desmarcar'
            : 'Visualize e gerencie seus agendamentos'}
        </p>
      </div>
      <CalendarioAgenda
        eventos={eventosList}
        feriados={feriadosList}
        podeMontarAgenda={podeMontarAgenda}
        pacientesAgendaveis={pacientesAgendaveis}
      />
    </div>
  )
}
