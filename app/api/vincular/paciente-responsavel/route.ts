import { createClient as createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!['admin', 'recepcao'].includes(profile?.role ?? '')) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const { paciente_id, responsavel_id, tipo = 'principal' } = await request.json()
  if (!paciente_id || !responsavel_id) {
    return NextResponse.json({ error: 'paciente_id e responsavel_id são obrigatórios.' }, { status: 400 })
  }

  const TIPOS_VALIDOS = ['principal', 'secundario']
  if (!TIPOS_VALIDOS.includes(tipo)) {
    return NextResponse.json({ error: 'tipo inválido' }, { status: 400 })
  }

  const adminClient = createAdminClient()

  // Garante que responsavel_id é mesmo um pai (não um terapeuta/admin/recepcao)
  const { data: alvo } = await adminClient
    .from('profiles')
    .select('role')
    .eq('id', responsavel_id)
    .single()

  if (!alvo) return NextResponse.json({ error: 'Responsável não encontrado' }, { status: 404 })
  if (alvo.role !== 'pai') {
    return NextResponse.json({ error: 'O usuário vinculado precisa ter perfil de responsável (pai)' }, { status: 400 })
  }

  // Garante que o paciente existe
  const { data: paciente } = await adminClient
    .from('pacientes')
    .select('id')
    .eq('id', paciente_id)
    .single()

  if (!paciente) return NextResponse.json({ error: 'Paciente não encontrado' }, { status: 404 })

  const { error } = await adminClient
    .from('paciente_responsaveis')
    .upsert({ paciente_id, responsavel_id, tipo }, { onConflict: 'paciente_id,responsavel_id' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
