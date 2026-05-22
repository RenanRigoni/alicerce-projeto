import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { datasFeriadosParaBloqueio } from '@/lib/agenda/feriados'
import {
  type AgendamentoOcupado,
  type ConflitoBloqueio,
  encontrarConflitosBloqueio,
  gerarSugestoesReposicao,
} from '@/lib/agenda/bloqueios'

type ModoBloqueio = 'verificar' | 'confirmar' | 'reposicao'

function erro(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

function normalizarDuracao(value: unknown) {
  const duracao = Number(value)
  if (!Number.isFinite(duracao)) return 50
  return Math.min(480, Math.max(15, Math.round(duracao)))
}

async function cancelarConflitos(adminClient: ReturnType<typeof createAdminClient>, conflitos: ConflitoBloqueio[], terapeutaId: string) {
  const agora = new Date().toISOString()

  for (const conflito of conflitos.filter(c => c.origem === 'recorrente' && c.pacienteId)) {
    const dataHora = new Date(conflito.data_hora)
    const expiraEmBase = new Date(dataHora.getTime() - 12 * 60 * 60 * 1000)
    const expiraEm = expiraEmBase > new Date() ? expiraEmBase : new Date()

    const { error } = await adminClient
      .from('sessao_confirmacoes')
      .upsert({
        paciente_id: conflito.pacienteId,
        terapeuta_id: terapeutaId,
        data_hora: dataHora.toISOString(),
        status: 'cancelada',
        expira_em: expiraEm.toISOString(),
        respondido_em: agora,
      }, { onConflict: 'paciente_id,data_hora' })

    if (error) return error
  }

  const idsManuais = conflitos
    .filter(c => c.origem === 'agendamento')
    .map(c => c.id)

  if (idsManuais.length > 0) {
    const { error } = await adminClient
      .from('agendamentos')
      .delete()
      .in('id', idsManuais)

    if (error) return error
  }

  return null
}

export async function POST(request: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return erro('Nao autorizado', 401)

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'terapeuta') {
    return erro('Apenas profissionais podem bloquear a propria agenda.', 403)
  }

  const body = await request.json().catch(() => null)
  if (!body) return erro('Body invalido')

  const modo = typeof body.modo === 'string' ? body.modo as ModoBloqueio : 'verificar'
  if (!['verificar', 'confirmar', 'reposicao'].includes(modo)) return erro('Modo invalido')

  const dataHora = typeof body.data_hora === 'string' ? body.data_hora : ''
  const dataHoraDate = new Date(dataHora)
  if (!dataHora || Number.isNaN(dataHoraDate.getTime())) return erro('Data e hora invalidas')

  if (dataHoraDate <= new Date()) {
    return erro('Escolha um horario futuro.')
  }

  const duracaoMinutos = normalizarDuracao(body.duracao_minutos)
  const motivo = typeof body.motivo === 'string' && body.motivo.trim() ? body.motivo.trim() : null
  const adminClient = createAdminClient()
  const fimBloqueio = new Date(dataHoraDate.getTime() + duracaoMinutos * 60 * 1000)
  const fimBusca = new Date(Date.now() + 45 * 24 * 60 * 60 * 1000)
  const inicioBusca = new Date(Math.min(dataHoraDate.getTime(), Date.now()) - 8 * 60 * 60 * 1000)

  const [
    { data: vinculos },
    { data: agendamentos },
    { data: confirmacoes },
    { data: feriados },
    { data: configAgenda },
    { data: horariosFuncionamento },
  ] = await Promise.all([
    adminClient
      .from('paciente_terapeutas')
      .select('horarios_atendimento, pacientes(id, nome, status)')
      .eq('terapeuta_id', user.id),
    adminClient
      .from('agendamentos')
      .select('id, tipo, titulo, motivo, data_hora, duracao_minutos, paciente_id, pacientes(id, nome)')
      .eq('terapeuta_id', user.id)
      .gte('data_hora', inicioBusca.toISOString())
      .lte('data_hora', new Date(Math.max(fimBloqueio.getTime(), fimBusca.getTime())).toISOString())
      .order('data_hora'),
    adminClient
      .from('sessao_confirmacoes')
      .select('paciente_id, data_hora, status')
      .eq('terapeuta_id', user.id)
      .gte('data_hora', inicioBusca.toISOString())
      .lte('data_hora', new Date(Math.max(fimBloqueio.getTime(), fimBusca.getTime())).toISOString()),
    adminClient
      .from('feriados')
      .select('data, anual'),
    adminClient
      .from('configuracoes_clinica')
      .select('bloquear_feriados, intervalo_agenda')
      .eq('singleton', 'default')
      .maybeSingle(),
    adminClient
      .from('horarios_funcionamento')
      .select('dia_semana, hora_inicio, hora_fim')
      .order('dia_semana'),
  ])

  const pacientes = (vinculos ?? [])
    .map((v: any) => ({ ...v.pacientes, horarios_atendimento: v.horarios_atendimento ?? [] }))
    .filter(Boolean)

  const anoAtual = new Date().getFullYear()
  const feriadosDatas = datasFeriadosParaBloqueio(
    feriados ?? [],
    anoAtual - 1,
    anoAtual + 2,
    configAgenda?.bloquear_feriados === true,
  )

  const eventosManuais: AgendamentoOcupado[] = ((agendamentos ?? []) as any[]).map(a => ({
    ...a,
    pacientes: Array.isArray(a.pacientes) ? (a.pacientes[0] ?? null) : (a.pacientes ?? null),
  }))
  const conflitos = encontrarConflitosBloqueio({
    pacientes,
    agendamentos: eventosManuais,
    confirmacoes: confirmacoes ?? [],
    feriadosDatas,
    dataHora,
    duracaoMinutos,
  })

  const conflitoReposicao = conflitos.filter(c => c.pacienteId)[0] ?? null
  const sugestoes = conflitoReposicao
    ? gerarSugestoesReposicao({
        pacientes,
        agendamentos: eventosManuais,
        confirmacoes: confirmacoes ?? [],
        feriadosDatas,
        horariosFuncionamento: horariosFuncionamento ?? [],
        intervaloAgenda: configAgenda?.intervalo_agenda ?? 50,
        conflito: conflitoReposicao,
        bloqueio: { data_hora: dataHora, duracao_minutos: duracaoMinutos },
      })
    : []

  if (modo === 'verificar') {
    return NextResponse.json({ conflitos, sugestoes })
  }

  const tituloBloqueio = motivo ? `Indisponivel - ${motivo}` : 'Indisponivel'

  if (modo === 'confirmar') {
    const cancelError = await cancelarConflitos(adminClient, conflitos, user.id)
    if (cancelError) return erro('Erro ao cancelar atendimento conflitante.', 500)

    const { error: insertError } = await adminClient.from('agendamentos').insert({
      terapeuta_id: user.id,
      paciente_id: null,
      tipo: 'bloqueio',
      titulo: tituloBloqueio,
      motivo,
      data_hora: dataHoraDate.toISOString(),
      duracao_minutos: duracaoMinutos,
      visivel_responsavel: false,
      criado_por: user.id,
    })

    if (insertError) return erro('Erro ao criar bloqueio.', 500)
    return NextResponse.json({ success: true })
  }

  const conflitoId = typeof body.conflito_id === 'string' ? body.conflito_id : ''
  const reposicaoDataHora = typeof body.reposicao_data_hora === 'string' ? body.reposicao_data_hora : ''
  const reposicaoDate = new Date(reposicaoDataHora)
  if (!conflitoId || Number.isNaN(reposicaoDate.getTime())) {
    return erro('Escolha um horario de reposicao.')
  }

  if (conflitos.length !== 1) {
    return erro('A reposicao automatica esta disponivel apenas para um atendimento por vez.')
  }

  const conflito = conflitos.find(c => c.id === conflitoId && c.pacienteId)
  if (!conflito) return erro('Atendimento para reposicao nao encontrado.')

  const reposicaoISO = reposicaoDate.toISOString()
  if (!sugestoes.some(s => new Date(s.data_hora).toISOString() === reposicaoISO)) {
    return erro('Horario de reposicao indisponivel.')
  }

  const cancelError = await cancelarConflitos(adminClient, [conflito], user.id)
  if (cancelError) return erro('Erro ao cancelar atendimento original.', 500)

  const { error: reposicaoError } = await adminClient.from('agendamentos').insert({
    terapeuta_id: user.id,
    paciente_id: conflito.pacienteId,
    tipo: 'reposicao',
    titulo: `Reposicao - ${conflito.pacienteNome ?? 'paciente'}`,
    motivo: `Reposicao de ${new Date(conflito.data_hora).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: 'America/Sao_Paulo',
    })}`,
    data_hora: reposicaoISO,
    duracao_minutos: conflito.duracao_minutos,
    visivel_responsavel: true,
    criado_por: user.id,
  })

  if (reposicaoError) return erro('Erro ao criar reposicao.', 500)

  const { error: bloqueioError } = await adminClient.from('agendamentos').insert({
    terapeuta_id: user.id,
    paciente_id: null,
    tipo: 'bloqueio',
    titulo: tituloBloqueio,
    motivo,
    data_hora: dataHoraDate.toISOString(),
    duracao_minutos: duracaoMinutos,
    visivel_responsavel: false,
    criado_por: user.id,
  })

  if (bloqueioError) return erro('Reposicao criada, mas houve erro ao criar bloqueio.', 500)

  return NextResponse.json({ success: true })
}

export async function DELETE(request: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return erro('Nao autorizado', 401)

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'terapeuta') {
    return erro('Apenas profissionais podem remover bloqueios da propria agenda.', 403)
  }

  const id = request.nextUrl.searchParams.get('id') ?? ''
  if (!id) return erro('Bloqueio invalido')

  const adminClient = createAdminClient()
  const { data: bloqueio, error: buscarError } = await adminClient
    .from('agendamentos')
    .select('id, tipo, terapeuta_id')
    .eq('id', id)
    .maybeSingle()

  if (buscarError) return erro('Erro ao buscar bloqueio.', 500)
  if (!bloqueio || bloqueio.tipo !== 'bloqueio' || bloqueio.terapeuta_id !== user.id) {
    return erro('Bloqueio nao encontrado.', 404)
  }

  const { error: deleteError } = await adminClient
    .from('agendamentos')
    .delete()
    .eq('id', id)
    .eq('tipo', 'bloqueio')
    .eq('terapeuta_id', user.id)

  if (deleteError) return erro('Erro ao remover bloqueio.', 500)

  return NextResponse.json({ success: true })
}
