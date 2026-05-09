import { createClient } from '@/lib/supabase/server'
import { CalendarioAgenda } from '@/components/terapia/CalendarioAgenda'
import { gerarSessoes } from '@/lib/agenda/sessoes'

export default async function AgendaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const inicio = new Date(); inicio.setMonth(inicio.getMonth() - 3); inicio.setHours(0, 0, 0, 0)
  const fim = new Date(); fim.setMonth(fim.getMonth() + 9); fim.setHours(23, 59, 59, 999)

  const [
    { data: vinculos },
    { data: especiais },
    { data: feriados },
    { data: confirmacoes },
  ] = await Promise.all([
    supabase
      .from('paciente_terapeutas')
      .select('pacientes(id, nome, status, horarios_atendimento)')
      .eq('terapeuta_id', user!.id),
    supabase
      .from('agendamentos')
      .select('id, tipo, titulo, motivo, data_hora, duracao_minutos, pacientes(id, nome)')
      .eq('terapeuta_id', user!.id)
      .neq('tipo', 'sessao')
      .order('data_hora'),
    supabase
      .from('feriados')
      .select('data, descricao')
      .order('data'),
    supabase
      .from('sessao_confirmacoes')
      .select('paciente_id, data_hora, token, status')
      .gte('data_hora', inicio.toISOString())
      .lte('data_hora', fim.toISOString()),
  ])

  const pacientes = (vinculos ?? [])
    .map((v: any) => v.pacientes)
    .filter((p: any) => p && p.status === 'ativo')

  const feriadosDatas = (feriados ?? []).map((f: any) => f.data)
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

  const eventosList = [
    ...sessoesRec.map(s => {
      // Extrai data e hora BRT diretamente da string ISO com offset -03:00
      // Formato: "2026-05-12T09:00:00-03:00"
      const brtDate = s.data_hora.slice(0, 10)
      const brtHora = s.data_hora.slice(11, 16)
      const confirmacao = s.paciente
        ? (confirmacaoMap.get(`${s.paciente.id}_${brtDate}_${brtHora}`) ?? null)
        : null
      return { ...s, confirmacao }
    }),
    ...(especiais ?? []).map((a: any) => ({
      id: a.id,
      tipo: a.tipo as string,
      titulo: a.titulo as string,
      motivo: a.motivo as string | null,
      data_hora: a.data_hora as string,
      duracao_minutos: a.duracao_minutos as number,
      paciente: a.pacientes ? { id: a.pacientes.id, nome: a.pacientes.nome } : null,
      confirmacao: null,
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
          Visualize e gerencie seus agendamentos
        </p>
      </div>
      <CalendarioAgenda eventos={eventosList} feriados={feriadosList} />
    </div>
  )
}
