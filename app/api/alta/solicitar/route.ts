import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { notificarAdmins } from '@/lib/notificacoes/inserir'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'terapeuta') {
    return NextResponse.json({ error: 'Apenas terapeutas podem solicitar alta' }, { status: 403 })
  }

  const { paciente_id, motivo } = await request.json()
  if (!paciente_id || !motivo?.trim()) {
    return NextResponse.json({ error: 'Paciente e motivo são obrigatórios' }, { status: 400 })
  }

  // Verifica se já existe solicitação pendente
  const { data: existente } = await supabase
    .from('solicitacoes_alta')
    .select('id')
    .eq('paciente_id', paciente_id)
    .eq('status', 'pendente')
    .maybeSingle()

  if (existente) {
    return NextResponse.json({ error: 'Já existe uma solicitação de alta pendente para este paciente' }, { status: 409 })
  }

  const { error } = await supabase.from('solicitacoes_alta').insert({
    paciente_id,
    solicitado_por: user.id,
    motivo: motivo.trim(),
  })

  if (error) return NextResponse.json({ error: 'Erro ao registrar solicitação' }, { status: 500 })

  const { data: paciente } = await supabase.from('pacientes').select('nome').eq('id', paciente_id).single()
  await notificarAdmins(
    'alta_solicitada',
    `Solicitação de alta — ${paciente?.nome ?? 'Paciente'}`,
    motivo.trim().slice(0, 120),
    `/admin/pacientes/${paciente_id}`
  )

  return NextResponse.json({ success: true })
}
