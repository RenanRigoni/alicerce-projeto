import { createClient as createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getTipoProfissionalConfig, isTipoProfissional } from '@/lib/profissionais'
import { temPermissao } from '@/lib/permissoes/definicoes'
import { NextRequest, NextResponse } from 'next/server'

function normalizarCpfCnpj(valor: unknown): string | null {
  if (typeof valor !== 'string') return null
  const digits = valor.replace(/\D/g, '')
  return digits || null
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role, permissoes').eq('id', user.id).single()
  if (!profile || !['admin', 'recepcao'].includes(profile.role)) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const { data: alvo } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', id)
    .single()

  if (!alvo) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })

  const permissoes = (profile.permissoes ?? {}) as Record<string, boolean>
  const podeGerenciarUsuarios = temPermissao(profile.role, permissoes, 'gerenciar_usuarios')
  const podeGerenciarEsteResponsavel = alvo.role === 'pai' && temPermissao(profile.role, permissoes, 'gerenciar_responsaveis')

  if (!podeGerenciarUsuarios && !podeGerenciarEsteResponsavel) {
    return NextResponse.json({ error: 'Sem permissão para editar este usuário' }, { status: 403 })
  }

  if (profile.role === 'recepcao' && podeGerenciarUsuarios && !['terapeuta', 'pai'].includes(alvo.role)) {
    return NextResponse.json({ error: 'Recepção só pode editar profissionais e responsáveis' }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Body inválido' }, { status: 400 })

  const nome = typeof body.nome === 'string' ? body.nome.trim() : ''
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  const telefone = typeof body.telefone === 'string' ? body.telefone.trim() : ''

  if (!nome || !email) {
    return NextResponse.json({ error: 'Nome e e-mail são obrigatórios' }, { status: 400 })
  }

  const profileUpdate: Record<string, string | null> = { nome }
  if (alvo.role !== 'pai') profileUpdate.telefone = telefone || null

  const metadataUpdate: Record<string, string | null> = {
    nome,
    role: alvo.role,
  }

  if (alvo.role === 'terapeuta') {
    const tipoProfissional = isTipoProfissional(body.tipo_profissional)
      ? body.tipo_profissional
      : null
    if (!tipoProfissional) {
      return NextResponse.json({ error: 'Tipo profissional inválido' }, { status: 400 })
    }

    const tipoConfig = getTipoProfissionalConfig(tipoProfissional)
    const conselhoNumero = typeof body.conselho_numero === 'string'
      ? body.conselho_numero.trim()
      : ''
    if (!conselhoNumero) {
      return NextResponse.json({ error: `${tipoConfig.conselho} é obrigatório para profissionais` }, { status: 400 })
    }

    const cpfCnpj = normalizarCpfCnpj(body.cpf_cnpj)
    if (cpfCnpj && ![11, 14].includes(cpfCnpj.length)) {
      return NextResponse.json({ error: 'CPF/CNPJ deve ter 11 ou 14 dígitos' }, { status: 400 })
    }

    profileUpdate.tipo_profissional = tipoConfig.value
    profileUpdate.conselho_tipo = tipoConfig.conselho
    profileUpdate.conselho_numero = conselhoNumero
    profileUpdate.crefito = conselhoNumero
    profileUpdate.cpf_cnpj = cpfCnpj

    metadataUpdate.tipo_profissional = tipoConfig.value
    metadataUpdate.conselho_tipo = tipoConfig.conselho
    metadataUpdate.conselho_numero = conselhoNumero
    metadataUpdate.crefito = conselhoNumero
  }

  const adminClient = createAdminClient()

  const { data: authUser, error: authFetchError } = await adminClient.auth.admin.getUserById(id)
  if (authFetchError || !authUser.user) {
    return NextResponse.json({ error: 'Usuário Auth não encontrado' }, { status: 404 })
  }

  const { error: authError } = await adminClient.auth.admin.updateUserById(id, {
    email,
    email_confirm: true,
    user_metadata: {
      ...(authUser.user.user_metadata ?? {}),
      ...metadataUpdate,
    },
  })

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 400 })
  }

  const { error: profileError } = await adminClient
    .from('profiles')
    .update(profileUpdate)
    .eq('id', id)

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Apenas admin pode deletar usuários' }, { status: 403 })
  }

  // Impede que o admin delete a si mesmo
  if (id === user.id) {
    return NextResponse.json({ error: 'Não é possível deletar sua própria conta' }, { status: 400 })
  }

  const adminClient = createAdminClient()

  // Deletar de auth.users cascateia para profiles automaticamente
  const { error } = await adminClient.auth.admin.deleteUser(id)
  if (error) {
    return NextResponse.json({ error: 'Erro ao deletar usuário' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
