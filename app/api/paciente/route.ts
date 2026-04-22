import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!['admin', 'recepcao'].includes(profile?.role ?? '')) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const body = await request.json()
  const {
    nome, data_nascimento, sexo, cpf,
    frequencia_atendimento, turno_preferencia,
    convenio_ou_particular, horarios_atendimento,
    terapeutas, responsavel_id,
  } = body

  if (!nome?.trim()) {
    return NextResponse.json({ error: 'Nome é obrigatório.' }, { status: 400 })
  }

  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data: paciente, error: erroPaciente } = await adminClient
    .from('pacientes')
    .insert({
      nome: nome.trim(),
      data_nascimento: data_nascimento || null,
      sexo: sexo || null,
      cpf: cpf?.trim() || null,
      frequencia_atendimento: frequencia_atendimento?.trim() || null,
      turno_preferencia: turno_preferencia || null,
      convenio_ou_particular: convenio_ou_particular || null,
      horarios_atendimento: horarios_atendimento ?? [],
    })
    .select('id')
    .single()

  if (erroPaciente || !paciente) {
    return NextResponse.json({ error: 'Erro ao cadastrar paciente.' }, { status: 500 })
  }

  const pacienteId = paciente.id

  // Vincula responsável se informado
  if (responsavel_id) {
    await adminClient.from('paciente_responsaveis').insert({
      paciente_id: pacienteId,
      responsavel_id,
      tipo: 'principal',
    })
  }

  // Vincula terapeutas se informados
  if (Array.isArray(terapeutas) && terapeutas.length > 0) {
    await adminClient.from('paciente_terapeutas').insert(
      terapeutas.map((tid: string) => ({ paciente_id: pacienteId, terapeuta_id: tid }))
    )
  }

  return NextResponse.json({ success: true, paciente_id: pacienteId })
}
