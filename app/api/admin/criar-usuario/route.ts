import { createAdminClient } from '@/lib/supabase/admin'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

const SENHA_PADRAO = 'alicerce'

function normalizarCpfCnpj(valor: string): string {
  return valor.replace(/\D/g, '')
}

export async function POST(request: NextRequest) {
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

  const { nome, email, role, crefito, cpf_cnpj, paciente_id } = body

  if (!nome || !email || !role) {
    return NextResponse.json({ error: 'Campos obrigatórios faltando' }, { status: 400 })
  }

  const ROLES_VALIDOS = ['admin', 'recepcao', 'terapeuta', 'pai']
  if (!ROLES_VALIDOS.includes(role)) {
    return NextResponse.json({ error: 'Role inválido' }, { status: 400 })
  }

  if (profile.role === 'recepcao' && !['terapeuta', 'pai'].includes(role)) {
    return NextResponse.json({ error: 'Recepção só pode cadastrar terapeutas e responsáveis' }, { status: 403 })
  }

  if (role === 'terapeuta' && !crefito?.trim()) {
    return NextResponse.json({ error: 'CREFITO é obrigatório para terapeutas (CREFITO Res. 426/2015)' }, { status: 400 })
  }

  if (role === 'pai') {
    const cpfDigits = normalizarCpfCnpj(cpf_cnpj ?? '')
    if (cpfDigits.length !== 11) {
      return NextResponse.json({ error: 'CPF é obrigatório para responsáveis (11 dígitos)' }, { status: 400 })
    }
  }

  const adminClient = createAdminClient()

  const { data: newUser, error: authError } = await adminClient.auth.admin.createUser({
    email,
    password: SENHA_PADRAO,
    email_confirm: true,
    user_metadata: {
      nome,
      role,
      ...(crefito?.trim() ? { crefito: crefito.trim() } : {}),
    },
  })

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 400 })
  }

  const cpfCnpjNorm = cpf_cnpj ? normalizarCpfCnpj(cpf_cnpj) : null

  await adminClient
    .from('profiles')
    .update({
      nome,
      ...(crefito?.trim() ? { crefito: crefito.trim() } : {}),
      ...(cpfCnpjNorm ? { cpf_cnpj: cpfCnpjNorm } : {}),
    })
    .eq('id', newUser.user.id)

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

  // Enviar e-mail para o usuário definir senha
  try {
    await adminClient.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/atualizar-senha`,
      },
    })
  } catch {
    // E-mail de boas-vindas falhou — usuário ainda foi criado
  }

  return NextResponse.json({ success: true, user_id: newUser.user.id })
}
