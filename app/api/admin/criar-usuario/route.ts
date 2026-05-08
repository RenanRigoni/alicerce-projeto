import { createAdminClient } from '@/lib/supabase/admin'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  // Verifica se quem está chamando é admin ou recepcao
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'recepcao'].includes(profile.role)) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  const { nome, email, senha, role, crefito, paciente_id } = body

  if (!nome || !email || !senha || !role) {
    return NextResponse.json({ error: 'Campos obrigatórios faltando' }, { status: 400 })
  }

  if (role === 'terapeuta' && !crefito?.trim()) {
    return NextResponse.json({ error: 'CREFITO é obrigatório para terapeutas (CREFITO Res. 426/2015)' }, { status: 400 })
  }

  // Usa service role para criar o usuário no Auth
  const adminClient = createAdminClient()

  const { data: newUser, error: authError } = await adminClient.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
    user_metadata: { nome, role, ...(crefito?.trim() ? { crefito: crefito.trim() } : {}) },
  })

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 400 })
  }

  // Atualiza nome e crefito no profile (trigger já criou com role correto)
  await adminClient
    .from('profiles')
    .update({ nome, ...(crefito?.trim() ? { crefito: crefito.trim() } : {}) })
    .eq('id', newUser.user.id)

  // Vincula ao paciente se informado
  if (paciente_id) {
    if (role === 'pai') {
      await adminClient.from('paciente_responsaveis').insert({
        paciente_id,
        responsavel_id: newUser.user.id,
      })
    } else if (role === 'terapeuta') {
      await adminClient.from('paciente_terapeutas').insert({
        paciente_id,
        terapeuta_id: newUser.user.id,
      })
    }
  }

  return NextResponse.json({ success: true, user_id: newUser.user.id })
}
