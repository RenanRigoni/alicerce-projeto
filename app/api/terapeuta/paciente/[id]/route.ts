import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { temPermissao } from '@/lib/permissoes/definicoes'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: pacienteId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role, permissoes').eq('id', user.id).single()
  if (profile?.role !== 'terapeuta') {
    return NextResponse.json({ error: 'Apenas terapeutas podem usar esta rota' }, { status: 403 })
  }
  if (!temPermissao(profile.role, (profile.permissoes ?? {}) as Record<string, boolean>, 'editar_pacientes')) {
    return NextResponse.json({ error: 'Sem permissão para editar dados de pacientes' }, { status: 403 })
  }

  const { data: vinculo } = await supabase
    .from('paciente_terapeutas')
    .select('paciente_id')
    .eq('paciente_id', pacienteId)
    .eq('terapeuta_id', user.id)
    .maybeSingle()

  if (!vinculo) {
    return NextResponse.json({ error: 'Sem permissão para editar este paciente' }, { status: 403 })
  }

  const body = await request.json()
  const { nome, data_nascimento, sexo, frequencia_atendimento, turno_preferencia, horarios_atendimento } = body

  const updates: Record<string, any> = {}
  if (nome !== undefined) updates.nome = nome
  if (data_nascimento !== undefined) updates.data_nascimento = data_nascimento || null
  if (sexo !== undefined) updates.sexo = sexo || null
  if (frequencia_atendimento !== undefined) updates.frequencia_atendimento = frequencia_atendimento || null
  if (turno_preferencia !== undefined) updates.turno_preferencia = turno_preferencia || null
  if (horarios_atendimento !== undefined) updates.horarios_atendimento = horarios_atendimento

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Nenhum campo para atualizar' }, { status: 400 })
  }

  const { error } = await supabase.from('pacientes').update(updates).eq('id', pacienteId)
  if (error) return NextResponse.json({ error: 'Erro ao atualizar paciente' }, { status: 500 })
  return NextResponse.json({ success: true })
}
