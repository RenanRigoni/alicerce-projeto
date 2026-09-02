import { enviarConviteAcesso, temEmailReal, type ModoConvite } from '@/lib/auth/convite'
import { temPermissao } from '@/lib/permissoes/definicoes'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, permissoes')
    .eq('id', user.id)
    .single()

  if (!profile) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  const usuarioId = body?.usuario_id
  const modo: ModoConvite = body?.modo === 'link' ? 'link' : 'email'

  if (typeof usuarioId !== 'string' || !usuarioId) {
    return NextResponse.json({ error: 'Usuário não informado' }, { status: 400 })
  }

  const { data: alvo } = await supabase
    .from('profiles')
    .select('role, nome')
    .eq('id', usuarioId)
    .single()

  if (!alvo) {
    return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
  }

  const permissoes = (profile.permissoes ?? {}) as Record<string, boolean>
  const podeGerenciarUsuarios = temPermissao(profile.role, permissoes, 'gerenciar_usuarios')
  const podeGerenciarResponsaveis = temPermissao(profile.role, permissoes, 'gerenciar_responsaveis')

  if (!podeGerenciarUsuarios && !(alvo.role === 'pai' && podeGerenciarResponsaveis)) {
    return NextResponse.json({ error: 'Sem permissão para reenviar o acesso deste usuário' }, { status: 403 })
  }

  const adminClient = createAdminClient()
  const { data: authUser, error: buscaErro } = await adminClient.auth.admin.getUserById(usuarioId)

  if (buscaErro || !authUser?.user?.email) {
    return NextResponse.json({ error: 'Usuário sem conta de acesso' }, { status: 404 })
  }

  const email = authUser.user.email

  if (modo === 'email' && !temEmailReal(email)) {
    return NextResponse.json(
      { error: 'Este usuário não tem e-mail cadastrado. Gere o link e envie manualmente.' },
      { status: 400 }
    )
  }

  const convite = await enviarConviteAcesso(adminClient, email, modo)

  return NextResponse.json({
    success: true,
    email: temEmailReal(email) ? email : null,
    email_enviado: convite.email_enviado,
    ...(convite.email_erro ? { email_erro: convite.email_erro } : {}),
    ...(convite.link_recuperacao ? { link_recuperacao: convite.link_recuperacao } : {}),
  })
}
