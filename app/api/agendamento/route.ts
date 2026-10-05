import { createAdminClient } from '@/lib/supabase/admin'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { temPermissao } from '@/lib/permissoes/definicoes'
import { datasFeriadosParaBloqueio } from '@/lib/agenda/feriados'
import { intervalosSobrepostos } from '@/lib/agenda/bloqueios'
import { contemHorario, removerHorario, validarHorario, type HorarioFixo } from '@/lib/agenda/horarios-fixos'
import { registrarAcao } from '@/lib/audit/registrar-acao'
import { NextRequest, NextResponse } from 'next/server'

function dataBRTFromIso(iso: string) {
  const dt = new Date(iso)
  const brt = new Date(dt.getTime() - 3 * 60 * 60 * 1000)
  return brt.toISOString().slice(0, 10)
}

export async function POST(request: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'NÃ£o autorizado' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, permissoes')
    .eq('id', user.id)
    .single()

  const permissoes = (profile?.permissoes ?? {}) as Record<string, boolean>
  if (!profile || !temPermissao(profile.role, permissoes, 'criar_agendamentos')) {
    return NextResponse.json({ error: 'Sem permissÃ£o para criar agendamentos' }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Body invÃ¡lido' }, { status: 400 })

  const terapeutaId = typeof body.terapeuta_id === 'string' ? body.terapeuta_id : ''
  const pacienteId = typeof body.paciente_id === 'string' && body.paciente_id ? body.paciente_id : null
  const tipo = typeof body.tipo === 'string' && body.tipo ? body.tipo : 'sessao'
  const titulo = typeof body.titulo === 'string' ? body.titulo.trim() : ''
  const motivo = typeof body.motivo === 'string' && body.motivo.trim() ? body.motivo.trim() : null
  const dataHora = typeof body.data_hora === 'string' ? body.data_hora : ''
  const duracaoMinutos = Number.isFinite(Number(body.duracao_minutos)) ? Number(body.duracao_minutos) : 50
  const visivelResponsavel = body.visivel_responsavel === true

  if (!terapeutaId || !titulo || !dataHora || Number.isNaN(Date.parse(dataHora))) {
    return NextResponse.json({ error: 'Profissional, tÃ­tulo, data e hora sÃ£o obrigatÃ³rios' }, { status: 400 })
  }

  const tiposPermitidos = ['sessao', 'devolutiva', 'reuniao', 'outro', 'bloqueio', 'reposicao']
  if (!tiposPermitidos.includes(tipo)) {
    return NextResponse.json({ error: 'Tipo de agendamento invalido' }, { status: 400 })
  }

  const adminClient = createAdminClient()

  const { data: configAgenda } = await adminClient
    .from('configuracoes_clinica')
    .select('bloquear_feriados')
    .eq('singleton', 'default')
    .maybeSingle()

  if (configAgenda?.bloquear_feriados === true) {
    const dataBRT = dataBRTFromIso(dataHora)
    const ano = Number(dataBRT.slice(0, 4))
    const { data: feriados } = await adminClient
      .from('feriados')
      .select('data, anual')
    const feriadosBloqueados = datasFeriadosParaBloqueio(feriados ?? [], ano - 1, ano + 1, true)

    if (feriadosBloqueados.includes(dataBRT)) {
      return NextResponse.json({ error: 'Agendamento bloqueado em feriado pela configuração da clínica.' }, { status: 400 })
    }
  }

  if (tipo !== 'bloqueio') {
    const inicio = new Date(dataHora)
    const fim = new Date(inicio.getTime() + duracaoMinutos * 60 * 1000)
    const { data: bloqueios } = await adminClient
      .from('agendamentos')
      .select('data_hora, duracao_minutos')
      .eq('terapeuta_id', terapeutaId)
      .eq('tipo', 'bloqueio')
      .gte('data_hora', new Date(inicio.getTime() - 8 * 60 * 60 * 1000).toISOString())
      .lte('data_hora', fim.toISOString())

    const bloqueado = (bloqueios ?? []).some((b: any) =>
      intervalosSobrepostos(dataHora, duracaoMinutos, b.data_hora, b.duracao_minutos ?? 50),
    )

    if (bloqueado) {
      return NextResponse.json({ error: 'Horario indisponivel na agenda da profissional.' }, { status: 400 })
    }
  }

  const { error } = await adminClient.from('agendamentos').insert({
    terapeuta_id: terapeutaId,
    paciente_id: pacienteId,
    tipo,
    titulo,
    motivo,
    data_hora: dataHora,
    duracao_minutos: duracaoMinutos,
    visivel_responsavel: visivelResponsavel,
    criado_por: user.id,
  })

  // 23505: o indice unico barrou um agendamento identico (duplo clique no botao)
  if (error?.code === '23505') {
    return NextResponse.json(
      { error: 'Este paciente já tem um agendamento igual nesse horário.' },
      { status: 409 },
    )
  }
  if (error) return NextResponse.json({ error: 'Erro ao salvar agendamento.' }, { status: 500 })

  return NextResponse.json({ success: true })
}

// ── DELETE: desmarcar na agenda geral ────────────────────────────────────────
//
// Quem monta a agenda da clínica inteira também precisa desfazer. Antes só a
// profissional removia atendimento, e só da agenda dela: a recepção criava um
// agendamento e ficava sem nenhum botão para apagar.
//
// `editar_agendamentos_alheios` é a trava: ela liga e desliga no painel de
// permissões, por pessoa, e vale para qualquer cargo que tenha a agenda geral.

type AlvoRemocao = 'avulso' | 'ocorrencia' | 'recorrente'

const ALVOS: readonly AlvoRemocao[] = ['avulso', 'ocorrencia', 'recorrente']

export async function DELETE(request: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, permissoes')
    .eq('id', user.id)
    .single()

  const permissoes = (profile?.permissoes ?? {}) as Record<string, boolean>
  if (!profile || !temPermissao(profile.role, permissoes, 'editar_agendamentos_alheios')) {
    return NextResponse.json(
      { error: 'Você não tem permissão para desmarcar atendimentos de outros profissionais.' },
      { status: 403 },
    )
  }

  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Body inválido' }, { status: 400 })

  const alvo = body.alvo as AlvoRemocao
  if (!ALVOS.includes(alvo)) {
    return NextResponse.json({ error: 'Tipo de remoção inválido.' }, { status: 400 })
  }

  const db = createAdminClient()

  // 1) Agendamento avulso: a linha some
  if (alvo === 'avulso') {
    const id = typeof body.id === 'string' ? body.id : ''
    if (!id) return NextResponse.json({ error: 'Agendamento inválido.' }, { status: 400 })

    // `.select('id')` revela a remoção que não aconteceu: sem isto, apagar um id
    // que não existe mais respondia sucesso e a tela dizia que tinha apagado.
    const { data: apagados, error } = await db.from('agendamentos').delete().eq('id', id).select('id')
    if (error) return NextResponse.json({ error: 'Erro ao remover o agendamento.' }, { status: 500 })
    if (!apagados || apagados.length === 0) {
      return NextResponse.json({ error: 'Este agendamento já não existe mais.' }, { status: 404 })
    }

    await registrarAcao('excluiu', 'agendamento', id)
    return NextResponse.json({ success: true, alvo })
  }

  const pacienteId = typeof body.paciente_id === 'string' ? body.paciente_id : ''
  const terapeutaId = typeof body.terapeuta_id === 'string' ? body.terapeuta_id : ''
  if (!pacienteId || !terapeutaId) {
    return NextResponse.json({ error: 'Paciente e profissional são obrigatórios.' }, { status: 400 })
  }

  // 2) Só aquele dia: as outras semanas do horário fixo seguem valendo
  if (alvo === 'ocorrencia') {
    const dataHora = typeof body.data_hora === 'string' ? body.data_hora : ''
    const dataHoraDate = new Date(dataHora)
    if (!dataHora || Number.isNaN(dataHoraDate.getTime())) {
      return NextResponse.json({ error: 'Sessão inválida.' }, { status: 400 })
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

    if (error) return NextResponse.json({ error: 'Erro ao desmarcar a sessão.' }, { status: 500 })

    await registrarAcao('excluiu', 'sessao_do_dia', pacienteId)
    return NextResponse.json({ success: true, alvo })
  }

  // 3) A recorrência inteira: o paciente deixa de vir toda semana naquele horário
  const horario = validarHorario(body.horario)
  if (!horario) return NextResponse.json({ error: 'Horário fixo inválido.' }, { status: 400 })

  const { data: vinculo } = await db
    .from('paciente_terapeutas')
    .select('horarios_atendimento')
    .eq('paciente_id', pacienteId)
    .eq('terapeuta_id', terapeutaId)
    .maybeSingle()

  const horarios = (vinculo?.horarios_atendimento ?? []) as HorarioFixo[]
  if (!vinculo || !contemHorario(horarios, horario)) {
    return NextResponse.json({ error: 'Este horário fixo não está na agenda dessa profissional.' }, { status: 404 })
  }

  const { data: atualizados, error } = await db
    .from('paciente_terapeutas')
    .update({ horarios_atendimento: removerHorario(horarios, horario) })
    .eq('paciente_id', pacienteId)
    .eq('terapeuta_id', terapeutaId)
    .select('paciente_id')

  if (error) return NextResponse.json({ error: 'Erro ao remover o horário fixo.' }, { status: 500 })
  if (!atualizados || atualizados.length === 0) {
    return NextResponse.json({ error: 'Não foi possível remover o horário fixo.' }, { status: 409 })
  }

  await registrarAcao('excluiu', 'horario_fixo', pacienteId)
  return NextResponse.json({ success: true, alvo })
}
