import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { temPermissao } from '@/lib/permissoes/definicoes'
import { datasFeriadosParaBloqueio } from '@/lib/agenda/feriados'
import { encontrarConflitosBloqueio, type AgendamentoOcupado } from '@/lib/agenda/bloqueios'
import {
  adicionarHorario,
  contemHorario,
  diaDaSemanaBRT,
  horaBRT,
  removerHorario,
  validarHorario,
  type HorarioFixo,
} from '@/lib/agenda/horarios-fixos'

type Db = ReturnType<typeof createAdminClient>

const DURACAO_PADRAO = 50

function erro(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

function normalizarDuracao(value: unknown) {
  const duracao = Number(value)
  if (!Number.isFinite(duracao)) return DURACAO_PADRAO
  return Math.min(480, Math.max(15, Math.round(duracao)))
}

/** Só profissional com a permissão de agenda ligada passa daqui. */
async function autorizar() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { erro: erro('Não autorizado', 401) }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, permissoes')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'terapeuta') {
    return { erro: erro('Apenas profissionais podem montar a própria agenda.', 403) }
  }
  const permissoes = (profile.permissoes ?? {}) as Record<string, boolean>
  if (!temPermissao(profile.role, permissoes, 'criar_agendamentos')) {
    return { erro: erro('Sem permissão para montar a própria agenda.', 403) }
  }

  return {
    userId: user.id,
    podeVerTodosPacientes: temPermissao(profile.role, permissoes, 'ver_todos_pacientes'),
  }
}

/**
 * Espelha a regra do seletor de pacientes: sem `ver_todos_pacientes`, ela só
 * agenda quem já está vinculado a ela. A tela filtra, mas quem decide é aqui.
 */
async function podeAgendarPaciente(
  db: Db,
  terapeutaId: string,
  pacienteId: string,
  podeVerTodosPacientes: boolean,
) {
  if (podeVerTodosPacientes) return true
  const { data } = await db
    .from('paciente_terapeutas')
    .select('paciente_id')
    .eq('paciente_id', pacienteId)
    .eq('terapeuta_id', terapeutaId)
    .maybeSingle()
  return !!data
}

async function pacienteAtivo(db: Db, pacienteId: string) {
  const { data } = await db
    .from('pacientes')
    .select('id, nome, status')
    .eq('id', pacienteId)
    .maybeSingle()
  if (!data || data.status !== 'ativo') return null
  return data
}

/**
 * Procura choque de horário na agenda da própria profissional, considerando
 * sessões recorrentes, agendamentos avulsos e cancelamentos já feitos.
 */
async function conflitosNaAgenda(db: Db, terapeutaId: string, dataHora: string, duracaoMinutos: number) {
  const inicio = new Date(new Date(dataHora).getTime() - 24 * 60 * 60 * 1000)
  const fim = new Date(new Date(dataHora).getTime() + 24 * 60 * 60 * 1000)

  const [{ data: vinculos }, { data: agendamentos }, { data: confirmacoes }, { data: feriados }, { data: config }] =
    await Promise.all([
      db.from('paciente_terapeutas')
        .select('horarios_atendimento, pacientes(id, nome, status)')
        .eq('terapeuta_id', terapeutaId),
      db.from('agendamentos')
        .select('id, tipo, titulo, motivo, data_hora, duracao_minutos, paciente_id, pacientes(id, nome)')
        .eq('terapeuta_id', terapeutaId)
        .gte('data_hora', inicio.toISOString())
        .lte('data_hora', fim.toISOString()),
      db.from('sessao_confirmacoes')
        .select('paciente_id, data_hora, status')
        .eq('terapeuta_id', terapeutaId)
        .gte('data_hora', inicio.toISOString())
        .lte('data_hora', fim.toISOString()),
      db.from('feriados').select('data, anual'),
      db.from('configuracoes_clinica').select('bloquear_feriados').eq('singleton', 'default').maybeSingle(),
    ])

  const pacientes = (vinculos ?? [])
    .map((v: any) => ({ ...v.pacientes, horarios_atendimento: v.horarios_atendimento ?? [] }))
    .filter((p: any) => p?.id)

  const anoAtual = new Date().getFullYear()
  const feriadosDatas = datasFeriadosParaBloqueio(
    feriados ?? [],
    anoAtual - 1,
    anoAtual + 2,
    config?.bloquear_feriados === true,
  )

  const eventosManuais: AgendamentoOcupado[] = ((agendamentos ?? []) as any[]).map(a => ({
    ...a,
    pacientes: Array.isArray(a.pacientes) ? (a.pacientes[0] ?? null) : (a.pacientes ?? null),
  }))

  return encontrarConflitosBloqueio({
    pacientes,
    agendamentos: eventosManuais,
    confirmacoes: confirmacoes ?? [],
    feriadosDatas,
    dataHora,
    duracaoMinutos,
  })
}

async function lerHorariosDoVinculo(db: Db, pacienteId: string, terapeutaId: string) {
  const { data } = await db
    .from('paciente_terapeutas')
    .select('horarios_atendimento')
    .eq('paciente_id', pacienteId)
    .eq('terapeuta_id', terapeutaId)
    .maybeSingle()
  return { existe: !!data, horarios: ((data?.horarios_atendimento ?? []) as HorarioFixo[]) }
}

// ── POST: agendar ────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const auth = await autorizar()
  if (auth.erro) return auth.erro
  const terapeutaId = auth.userId!

  const body = await request.json().catch(() => null)
  if (!body) return erro('Body inválido')

  const modo = body.modo === 'recorrente' ? 'recorrente' : 'avulso'
  const pacienteId = typeof body.paciente_id === 'string' ? body.paciente_id : ''
  if (!pacienteId) return erro('Escolha um paciente.')

  const dataHora = typeof body.data_hora === 'string' ? body.data_hora : ''
  const dataHoraDate = new Date(dataHora)
  if (!dataHora || Number.isNaN(dataHoraDate.getTime())) return erro('Data e hora inválidas.')

  const duracaoMinutos = normalizarDuracao(body.duracao_minutos)
  const db = createAdminClient()

  const paciente = await pacienteAtivo(db, pacienteId)
  if (!paciente) return erro('Paciente não encontrado ou inativo.', 404)

  if (!(await podeAgendarPaciente(db, terapeutaId, pacienteId, auth.podeVerTodosPacientes!))) {
    return erro('Este paciente não está vinculado a você.', 403)
  }

  // Avulso no passado não faz sentido; recorrente vale daqui pra frente
  if (modo === 'avulso' && dataHoraDate <= new Date()) {
    return erro('Escolha um horário futuro.')
  }

  const conflitos = await conflitosNaAgenda(db, terapeutaId, dataHora, duracaoMinutos)
  if (conflitos.length > 0 && body.ignorar_conflito !== true) {
    return NextResponse.json({ conflitos }, { status: 409 })
  }

  if (modo === 'avulso') {
    const { error } = await db.from('agendamentos').insert({
      terapeuta_id: terapeutaId,
      paciente_id: pacienteId,
      tipo: 'sessao',
      titulo: `Sessão — ${paciente.nome}`,
      motivo: null,
      data_hora: dataHoraDate.toISOString(),
      duracao_minutos: duracaoMinutos,
      visivel_responsavel: true,
      criado_por: terapeutaId,
    })
    // 23505: o indice unico barrou um agendamento identico (duplo toque no botao)
    if (error?.code === '23505') {
      return erro('Você já agendou este paciente nesse horário.', 409)
    }
    if (error) return erro('Erro ao criar o agendamento.', 500)
    return NextResponse.json({ success: true, modo })
  }

  const horario = validarHorario({ dia: diaDaSemanaBRT(dataHora), hora: horaBRT(dataHora) })
  if (!horario) return erro('A clínica não atende neste dia da semana.')

  const { existe, horarios } = await lerHorariosDoVinculo(db, pacienteId, terapeutaId)
  if (contemHorario(horarios, horario)) {
    return erro('Este paciente já tem horário fixo neste dia e hora com você.')
  }

  const proximos = adicionarHorario(horarios, horario)

  if (existe) {
    const { error } = await db
      .from('paciente_terapeutas')
      .update({ horarios_atendimento: proximos })
      .eq('paciente_id', pacienteId)
      .eq('terapeuta_id', terapeutaId)
    if (error) return erro('Erro ao salvar o horário fixo.', 500)
  } else {
    // Horário fixo com paciente ainda não vinculado cria o vínculo com ela mesma
    const { error } = await db
      .from('paciente_terapeutas')
      .insert({ paciente_id: pacienteId, terapeuta_id: terapeutaId, horarios_atendimento: proximos })
    if (error) return erro('Erro ao vincular o paciente a você.', 500)
  }

  return NextResponse.json({ success: true, modo, horario, vinculoCriado: !existe })
}

// ── DELETE: desmarcar ────────────────────────────────────────────────────────

export async function DELETE(request: NextRequest) {
  const auth = await autorizar()
  if (auth.erro) return auth.erro
  const terapeutaId = auth.userId!

  const body = await request.json().catch(() => null)
  if (!body) return erro('Body inválido')

  const db = createAdminClient()
  const alvo = body.alvo

  // 1) Agendamento avulso: some de vez
  if (alvo === 'avulso') {
    const id = typeof body.id === 'string' ? body.id : ''
    if (!id) return erro('Agendamento inválido.')

    const { data: agendamento } = await db
      .from('agendamentos')
      .select('id, terapeuta_id')
      .eq('id', id)
      .maybeSingle()

    if (!agendamento || agendamento.terapeuta_id !== terapeutaId) {
      return erro('Agendamento não encontrado na sua agenda.', 404)
    }

    const { error } = await db.from('agendamentos').delete().eq('id', id).eq('terapeuta_id', terapeutaId)
    if (error) return erro('Erro ao remover o agendamento.', 500)
    return NextResponse.json({ success: true, alvo })
  }

  // 2) Uma ocorrência do horário fixo: as outras semanas seguem valendo
  if (alvo === 'ocorrencia') {
    const pacienteId = typeof body.paciente_id === 'string' ? body.paciente_id : ''
    const dataHora = typeof body.data_hora === 'string' ? body.data_hora : ''
    const dataHoraDate = new Date(dataHora)
    if (!pacienteId || Number.isNaN(dataHoraDate.getTime())) return erro('Sessão inválida.')

    if (!(await podeAgendarPaciente(db, terapeutaId, pacienteId, auth.podeVerTodosPacientes!))) {
      return erro('Este paciente não está vinculado a você.', 403)
    }

    const agora = new Date()
    const expiraBase = new Date(dataHoraDate.getTime() - 12 * 60 * 60 * 1000)

    const { error } = await db.from('sessao_confirmacoes').upsert({
      paciente_id: pacienteId,
      terapeuta_id: terapeutaId,
      data_hora: dataHoraDate.toISOString(),
      status: 'cancelada',
      expira_em: (expiraBase > agora ? expiraBase : agora).toISOString(),
      respondido_em: agora.toISOString(),
    }, { onConflict: 'paciente_id,data_hora' })

    if (error) return erro('Erro ao desmarcar a sessão.', 500)
    return NextResponse.json({ success: true, alvo })
  }

  // 3) O horário fixo inteiro: o paciente deixa de vir toda semana
  if (alvo === 'recorrente') {
    const pacienteId = typeof body.paciente_id === 'string' ? body.paciente_id : ''
    const horario = validarHorario(body.horario)
    if (!pacienteId || !horario) return erro('Horário fixo inválido.')

    const { existe, horarios } = await lerHorariosDoVinculo(db, pacienteId, terapeutaId)
    if (!existe || !contemHorario(horarios, horario)) {
      return erro('Este horário fixo não está na sua agenda.', 404)
    }

    const { error } = await db
      .from('paciente_terapeutas')
      .update({ horarios_atendimento: removerHorario(horarios, horario) })
      .eq('paciente_id', pacienteId)
      .eq('terapeuta_id', terapeutaId)

    if (error) return erro('Erro ao remover o horário fixo.', 500)

    return NextResponse.json({ success: true, alvo })
  }

  return erro('Tipo de remoção inválido.')
}
