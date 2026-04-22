import { createClient } from '@supabase/supabase-js'
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

  const { nome, email, senha, role, paciente_id } = await request.json()

  if (!nome || !email || !senha || !role) {
    return NextResponse.json({ error: 'Campos obrigatórios faltando' }, { status: 400 })
  }

  // Usa service role para criar o usuário no Auth
  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data: newUser, error: authError } = await adminClient.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
    user_metadata: { nome, role },
  })

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 400 })
  }

  // Atualiza o nome no profile (trigger já criou com role correto)
  await adminClient
    .from('profiles')
    .update({ nome })
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
