import { createClient } from '@/lib/supabase/server'
import { gerarSessoesPorProfissional } from '@/lib/agenda/sessoes'
import { datasFeriadosParaBloqueio } from '@/lib/agenda/feriados'
import { type AgendamentoItem } from '@/components/admin/AgendamentosLista'
import { type EventoAgenda } from '@/components/terapia/CalendarioAgenda'
import { getPerfilPermissoesAtual } from '@/lib/permissoes/verificar'
import { notFound } from 'next/navigation'
import { AgendaAdminClient } from './AgendaAdminClient'

export default async function AgendamentosPage() {
  const perfil = await getPerfilPermissoesAtual()
  if (!perfil?.efetivas.criar_agendamentos) notFound()

  const supabase = await createClient()

  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  const em14dias = new Date(hoje.getTime() + 14 * 24 * 60 * 60 * 1000)

  // Intervalo largo para o calendário
  const inicio = new Date()
  inicio.setMonth(inicio.getMonth() - 3)
  inicio.setHours(0, 0, 0, 0)
  const fim = new Date()
  fim.setMonth(fim.getMonth() + 9)
  fim.setHours(23, 59, 59, 999)

  const [
    { data: vinculosAtivos },
    { data: especiais },
    { data: passados },
    { data: feriados },
    { data: configAgenda },
    { data: confirmacoes },
    { data: terapeutasAtivos },
  ] = await Promise.all([
    // O horário fixo vive no vínculo, por profissional. Ler de pacientes.horarios_atendimento
    // (a soma) fazia toda sessão de paciente compartilhado aparecer como da primeira profissional.
    supabase
      .from('paciente_terapeutas')
      .select('terapeuta_id, horarios_atendimento, profiles(id, nome), pacientes!inner(id, nome, status)')
      .eq('pacientes.status', 'ativo'),
    supabase
      .from('agendamentos')
      .select(`
        id, tipo, titulo, motivo, data_hora, duracao_minutos, visivel_responsavel,
        pacientes(id, nome),
        profiles!agendamentos_terapeuta_id_fkey(id, nome)
      `)
      // Inclui tipo 'sessao': agendamentos avulsos ficavam invisíveis na agenda
      .gte('data_hora', inicio.toISOString())
      .order('data_hora'),
    supabase
      .from('agendamentos')
      .select(`
        id, tipo, titulo, data_hora,
        pacientes(nome),
        profiles!agendamentos_terapeuta_id_fkey(nome)
      `)
      .lt('data_hora', hoje.toISOString())
      .order('data_hora', { ascending: false })
      .limit(20),
    supabase
      .from('feriados')
      .select('data, descricao, anual'),
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
    supabase
      .from('profiles')
      .select('id, nome')
      .eq('role', 'terapeuta')
      .eq('ativo', true)
      .order('nome'),
  ])

  const anoAtual = new Date().getFullYear()
  const feriadosDatas = datasFeriadosParaBloqueio(
    feriados ?? [],
    anoAtual - 1,
    anoAtual + 2,
    configAgenda?.bloquear_feriados === true,
  )

  const vinculosParaGerar = ((vinculosAtivos ?? []) as any[])
    .filter(v => v.pacientes)
    .map(v => ({
      terapeutaId: v.terapeuta_id as string,
      terapeutaNome: (v.profiles?.nome as string | undefined) ?? null,
      paciente: { id: v.pacientes.id as string, nome: v.pacientes.nome as string },
      horarios: (v.horarios_atendimento ?? []) as Array<{ dia: string; hora: string }>,
    }))

  // Mapa de confirmações
  const confirmacaoMap = new Map<string, { token: string; status: string }>()
  for (const c of confirmacoes ?? []) {
    const dt = new Date(c.data_hora as string)
    const brt = new Date(dt.getTime() - 3 * 60 * 60 * 1000)
    const brtDate = brt.toISOString().slice(0, 10)
    const brtHora = brt.toISOString().slice(11, 16)
    confirmacaoMap.set(`${c.paciente_id}_${brtDate}_${brtHora}`, {
      token: c.token as string,
      status: c.status as string,
    })
  }

  const sessoesRec = gerarSessoesPorProfissional(vinculosParaGerar, inicio, fim, feriadosDatas)

  // Linha gravada vence a sessão projetada, e duplicatas no mesmo horário viram uma só
  const avulsosPorChave = new Map<string, any>()
  for (const a of (especiais ?? []) as any[]) {
    if (a.tipo !== 'sessao' || !a.pacientes?.id) continue
    const chave = `${a.pacientes.id}|${new Date(a.data_hora).toISOString()}`
    if (!avulsosPorChave.has(chave)) avulsosPorChave.set(chave, a)
  }
  const idsAvulsosMantidos = new Set([...avulsosPorChave.values()].map(a => a.id))
  const ehAvulsoDuplicado = (a: any) => a.tipo === 'sessao' && !idsAvulsosMantidos.has(a.id)
  const temAvulso = (pacienteId: string, dataHora: string) =>
    avulsosPorChave.has(`${pacienteId}|${new Date(dataHora).toISOString()}`)

  // ── Eventos para o CalendarioAgenda ──────────────────────────────────────
  const eventosList: EventoAgenda[] = [
    ...sessoesRec.filter(s => !s.paciente || !temAvulso(s.paciente.id, s.data_hora)).map(s => {
      const brtDate = s.data_hora.slice(0, 10)
      const brtHora = s.data_hora.slice(11, 16)
      const confirmacao = s.paciente
        ? (confirmacaoMap.get(`${s.paciente.id}_${brtDate}_${brtHora}`) ?? null)
        : null
      return {
        id: s.id,
        tipo: s.tipo,
        titulo: s.titulo,
        motivo: null,
        data_hora: s.data_hora,
        duracao_minutos: s.duracao_minutos,
        paciente: s.paciente ?? null,
        confirmacao,
        terapeutaId: s.terapeutaId,
        terapeutaNome: s.terapeutaNome,
      }
    }),
    ...(especiais ?? []).filter((a: any) => !ehAvulsoDuplicado(a)).map((a: any) => ({
      id: a.id,
      tipo: a.tipo as string,
      titulo: a.titulo as string,
      motivo: a.motivo as string | null,
      data_hora: a.data_hora as string,
      duracao_minutos: a.duracao_minutos as number,
      paciente: a.pacientes ? { id: a.pacientes.id, nome: a.pacientes.nome } : null,
      confirmacao: null,
      terapeutaId: (a.profiles as any)?.id ?? null,
      terapeutaNome: (a.profiles as any)?.nome ?? null,
    })),
  ]

  const feriadosList = (feriados ?? []).map((f: any) => ({
    data: f.data as string,
    descricao: f.descricao as string,
  }))

  // ── Dados para a lista dos próximos 14 dias ───────────────────────────────
  const sessoesRec14 = gerarSessoesPorProfissional(vinculosParaGerar, hoje, em14dias, feriadosDatas)

  const proximos: AgendamentoItem[] = [
    ...sessoesRec14.filter(s => !s.paciente || !temAvulso(s.paciente.id, s.data_hora)).map(s => {
      const brtDate = s.data_hora.slice(0, 10)
      const brtHora = s.data_hora.slice(11, 16)
      const confirmacao = s.paciente
        ? (confirmacaoMap.get(`${s.paciente.id}_${brtDate}_${brtHora}`) ?? null)
        : null
      return {
        id: s.id,
        tipo: s.tipo,
        titulo: s.titulo,
        motivo: null,
        data_hora: s.data_hora,
        duracao_minutos: s.duracao_minutos,
        pacienteId: s.paciente?.id ?? null,
        pacienteNome: s.paciente?.nome ?? null,
        terapeutaId: s.terapeutaId,
        terapeutaNome: s.terapeutaNome,
        visivel_responsavel: true,
        confirmacao,
      }
    }),
    ...(especiais ?? [])
      .filter((a: any) => !ehAvulsoDuplicado(a))
      .filter((a: any) => a.data_hora >= hoje.toISOString() && a.data_hora <= em14dias.toISOString())
      .map((a: any) => ({
        id: a.id,
        tipo: a.tipo,
        titulo: a.titulo,
        motivo: a.motivo,
        data_hora: a.data_hora,
        duracao_minutos: a.duracao_minutos,
        pacienteId: a.pacientes?.id ?? null,
        pacienteNome: a.pacientes?.nome ?? null,
        terapeutaId: (a.profiles as any)?.id ?? null,
        terapeutaNome: (a.profiles as any)?.nome ?? null,
        visivel_responsavel: a.visivel_responsavel,
        confirmacao: null,
      })),
  ].sort((a, b) => a.data_hora.localeCompare(b.data_hora))

  const terapeutasFiltroList = (terapeutasAtivos ?? []).map((t: any) => ({ id: t.id as string, nome: t.nome as string }))
  const passadosList = (passados ?? []).map((a: any) => ({
    id: a.id as string,
    titulo: a.titulo as string,
    data_hora: a.data_hora as string,
    pacientes: a.pacientes ? { nome: a.pacientes.nome as string } : null,
    profiles: (a.profiles as any) ? { nome: (a.profiles as any).nome as string } : null,
  }))

  return (
    <div className="space-y-8">
      {/* Título */}
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-2xl font-semibold"
            style={{ fontFamily: 'var(--font-lora)', color: 'var(--color-ink)' }}
          >
            Agenda Geral
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-ink-soft)' }}>
            Todos os profissionais — visualize, filtre e gerencie
          </p>
        </div>
        <a
          href="/admin/agendamentos/novo"
          className="text-sm font-medium px-4 py-2 rounded-xl text-white transition-all duration-200 active:scale-[0.98]"
          style={{ background: 'var(--color-rose-main)' }}
        >
          + Novo agendamento
        </a>
      </div>

      <AgendaAdminClient
        eventos={eventosList}
        feriados={feriadosList}
        proximos={proximos}
        terapeutasFiltro={terapeutasFiltroList}
        passados={passadosList}
      />
    </div>
  )
}
