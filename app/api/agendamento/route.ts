import { createAdminClient } from '@/lib/supabase/admin'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { temPermissao } from '@/lib/permissoes/definicoes'
import { datasFeriadosParaBloqueio } from '@/lib/agenda/feriados'
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

  if (error) return NextResponse.json({ error: 'Erro ao salvar agendamento.' }, { status: 500 })

  return NextResponse.json({ success: true })
}
