import { contemHorario, diaDaSemanaBRT, horaBRT, type HorarioFixo } from '@/lib/agenda/horarios-fixos'

interface VinculoTerapeuta {
  terapeuta_id: string
  horarios_atendimento: HorarioFixo[] | null
}

interface ClienteComFrom {
  from: (tabela: string) => any
}

/**
 * Descobre de quem é a sessão daquele paciente naquele horário.
 *
 * Um paciente pode ser atendido por mais de uma profissional, cada uma no seu
 * horário fixo. Quem "dona" do horário é quem tem aquele dia e hora no vínculo.
 *
 * Retorna todas as profissionais vinculadas quando nenhuma bate com o horário
 * (sessão avulsa, horário remarcado, cadastro incompleto). É melhor avisar uma
 * a mais do que deixar a responsável sem saber que o paciente desmarcou.
 */
export async function terapeutasDaSessao(
  db: ClienteComFrom,
  pacienteId: string,
  dataHora: string,
): Promise<string[]> {
  // 1) Agendamento gravado naquele instante manda: foi alguém marcando de propósito
  const { data: avulsos } = await db
    .from('agendamentos')
    .select('terapeuta_id')
    .eq('paciente_id', pacienteId)
    .eq('data_hora', new Date(dataHora).toISOString())

  const donosDoAvulso = [...new Set(
    ((avulsos ?? []) as Array<{ terapeuta_id: string | null }>)
      .map(a => a.terapeuta_id)
      .filter((id): id is string => !!id),
  )]
  if (donosDoAvulso.length > 0) return donosDoAvulso

  const { data } = await db
    .from('paciente_terapeutas')
    .select('terapeuta_id, horarios_atendimento')
    .eq('paciente_id', pacienteId)

  const vinculos = (data ?? []) as VinculoTerapeuta[]
  if (vinculos.length === 0) return []
  if (vinculos.length === 1) return [vinculos[0].terapeuta_id]

  // 2) Dona do horário fixo: mesmo dia da semana e mesma hora no vínculo dela
  const horario: HorarioFixo = { dia: diaDaSemanaBRT(dataHora), hora: horaBRT(dataHora) }
  const donas = vinculos
    .filter(v => contemHorario(v.horarios_atendimento ?? [], horario))
    .map(v => v.terapeuta_id)

  // 3) Nenhuma bate: avisa todas em vez de arriscar deixar a responsável sem saber
  return donas.length > 0 ? donas : vinculos.map(v => v.terapeuta_id)
}
