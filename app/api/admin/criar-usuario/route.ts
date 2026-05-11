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

  const {
    nome, email, role, crefito, cpf_cnpj, paciente_id,
    telefone, cep, endereco, numero, complemento, cidade,
    contato_emergencia_nome, contato_emergencia_telefone,
  } = body

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

  const userId = newUser.user.id
  const cpfCnpjNorm = cpf_cnpj ? normalizarCpfCnpj(cpf_cnpj) : null

  await adminClient
    .from('profiles')
    .update({
      nome,
      ...(telefone?.trim() ? { telefone: telefone.trim() } : {}),
      ...(crefito?.trim() ? { crefito: crefito.trim() } : {}),
      ...(cpfCnpjNorm ? { cpf_cnpj: cpfCnpjNorm } : {}),
    })
    .eq('id', userId)

  if (role === 'pai') {
    await adminClient.from('responsaveis_detalhes').upsert({
      id: userId,
      telefone_principal: telefone?.trim() ?? null,
      cep: cep?.replace(/\D/g, '') ?? null,
      endereco: endereco?.trim() ?? null,
      numero: numero?.trim() ?? null,
      complemento: complemento?.trim() ?? null,
      cidade: cidade?.trim() ?? null,
      contato_emergencia: contato_emergencia_nome?.trim() ?? null,
      contato_emergencia_telefone: contato_emergencia_telefone?.trim() ?? null,
    })
  }

  if (paciente_id) {
    if (role === 'pai') {
      await adminClient.from('paciente_responsaveis').insert({
        paciente_id,
        responsavel_id: userId,
      })
    } else if (role === 'terapeuta') {
      await adminClient.from('paciente_terapeutas').insert({
        paciente_id,
        terapeuta_id: userId,
      })
    }
  }

  // Tenta enviar e-mail via SMTP do Supabase.
  // Fallback: retorna o link direto para o admin compartilhar manualmente
  // (necessário quando rate limit de 2 emails/hora do free tier é atingido).
  let emailEnviado = false
  let linkRecuperacao: string | null = null

  try {
    const { error: emailError } = await adminClient.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/atualizar-senha`,
    })
    emailEnviado = !emailError
  } catch {
    emailEnviado = false
  }

  if (!emailEnviado) {
    try {
      const { data: linkData } = await adminClient.auth.admin.generateLink({
        type: 'recovery',
        email,
        options: {
          redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/atualizar-senha`,
        },
      })
      linkRecuperacao = linkData?.properties?.action_link ?? null
    } catch {
      // ignora falha no fallback
    }
  }

  return NextResponse.json({
    success: true,
    user_id: userId,
    email_enviado: emailEnviado,
    ...(linkRecuperacao ? { link_recuperacao: linkRecuperacao } : {}),
  })
}
