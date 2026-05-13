import { createClient as createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { temPermissao } from '@/lib/permissoes/definicoes'

export async function POST(request: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role, permissoes').eq('id', user.id).single()
  const permissoes = (profile?.permissoes ?? {}) as Record<string, boolean>
  if (!profile || !temPermissao(profile.role, permissoes, 'gerenciar_responsaveis')) {
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

  if (profile.role === 'terapeuta' && !temPermissao(profile.role, permissoes, 'ver_todos_pacientes')) {
    const { data: vinculo } = await supabase
      .from('paciente_terapeutas')
      .select('paciente_id')
      .eq('paciente_id', paciente_id)
      .eq('terapeuta_id', user.id)
      .maybeSingle()

    if (!vinculo) {
      return NextResponse.json({ error: 'Sem permissão para gerenciar responsáveis deste paciente' }, { status: 403 })
    }
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
