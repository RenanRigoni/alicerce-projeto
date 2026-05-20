import { createAdminClient } from '@/lib/supabase/admin'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { temPermissao } from '@/lib/permissoes/definicoes'
import { NextRequest, NextResponse } from 'next/server'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, permissoes')
    .eq('id', user.id)
    .single()

  const permissoes = (profile?.permissoes ?? {}) as Record<string, boolean>
  if (!profile || !temPermissao(profile.role, permissoes, 'editar_pacientes')) {
    return NextResponse.json({ error: 'Sem permissão para editar dados de pacientes' }, { status: 403 })
  }

  if (profile.role === 'terapeuta' && !temPermissao(profile.role, permissoes, 'ver_todos_pacientes')) {
    const { data: vinculo } = await supabase
      .from('paciente_terapeutas')
      .select('paciente_id')
      .eq('paciente_id', id)
      .eq('terapeuta_id', user.id)
      .maybeSingle()

    if (!vinculo) {
      return NextResponse.json({ error: 'Sem permissão para editar este paciente' }, { status: 403 })
    }
  }

  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Body inválido' }, { status: 400 })

  if (body.terapeutas !== undefined && !temPermissao(profile.role, permissoes, 'vincular_terapeutas')) {
    return NextResponse.json({ error: 'Sem permissão para vincular profissionais ao paciente' }, { status: 403 })
  }

  const adminClient = createAdminClient()
  const updates: Record<string, unknown> = {}

  if (typeof body.nome === 'string') updates.nome = body.nome.trim()
  if (body.data_nascimento !== undefined) updates.data_nascimento = body.data_nascimento || null
  if (body.sexo !== undefined) updates.sexo = body.sexo || null
  if (body.frequencia_atendimento !== undefined) updates.frequencia_atendimento = body.frequencia_atendimento || null
  if (body.turno_preferencia !== undefined) updates.turno_preferencia = body.turno_preferencia || null
  if (body.convenio_ou_particular !== undefined) updates.convenio_ou_particular = body.convenio_ou_particular || null
  if (body.horarios_atendimento !== undefined) updates.horarios_atendimento = body.horarios_atendimento ?? []

  if (body.cpf !== undefined) {
    const cpfPlain = typeof body.cpf === 'string' ? body.cpf.trim() : ''
    if (cpfPlain) {
      const { data: enc } = await adminClient.rpc('encrypt_cpf', { cpf_plain: cpfPlain }).maybeSingle()
      updates.cpf_cifrado = (enc as string | null) ?? null
    } else {
      updates.cpf_cifrado = null
    }
  }

  if (Object.keys(updates).length > 0) {
    updates.atualizado_em = new Date().toISOString()
    const { error } = await adminClient.from('pacientes').update(updates).eq('id', id)
    if (error) return NextResponse.json({ error: 'Erro ao atualizar paciente' }, { status: 500 })
  }

  if (body.terapeutas !== undefined) {
    const terapeutasRaw: Array<{ id: string; horarios_atendimento: Array<{ dia: string; hora: string }> }> =
      Array.isArray(body.terapeutas)
        ? body.terapeutas.filter((t: unknown) => t && typeof (t as any).id === 'string' && (t as any).id.length > 0)
        : []

    await adminClient.from('paciente_terapeutas').delete().eq('paciente_id', id)
    if (terapeutasRaw.length > 0) {
      const { error } = await adminClient
        .from('paciente_terapeutas')
        .insert(terapeutasRaw.map(t => ({
          paciente_id: id,
          terapeuta_id: t.id,
          horarios_atendimento: Array.isArray(t.horarios_atendimento) ? t.horarios_atendimento : [],
        })))
      if (error) return NextResponse.json({ error: 'Erro ao vincular profissionais' }, { status: 500 })
    }

    // Mantém horarios_atendimento global como merge de todos os terapeutas (backwards compat)
    const mergedHorarios = terapeutasRaw.flatMap(t =>
      Array.isArray(t.horarios_atendimento) ? t.horarios_atendimento : []
    )
    await adminClient.from('pacientes').update({
      horarios_atendimento: mergedHorarios,
      frequencia_atendimento: mergedHorarios.length > 0 ? `${mergedHorarios.length}x por semana` : null,
      atualizado_em: new Date().toISOString(),
    }).eq('id', id)
  }

  return NextResponse.json({ success: true })
}
