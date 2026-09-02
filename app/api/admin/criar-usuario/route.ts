import { getTipoProfissionalConfig, isCodigoCboValido, isTipoProfissional, isUfBrasil, normalizarCodigoCbo } from '@/lib/profissionais'
import { temPermissao } from '@/lib/permissoes/definicoes'
import { enviarConviteAcesso, DOMINIO_EMAIL_INTERNO } from '@/lib/auth/convite'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

const SENHA_PADRAO = 'alicerce'

function normalizarCpfCnpj(valor: string): string {
  return valor.replace(/\D/g, '')
}

function gerarEmailInterno(cpf: string): string {
  return `${cpf}@${DOMINIO_EMAIL_INTERNO}`
}

/**
 * O Supabase devolve "Database error creating new user" para qualquer violação
 * de constraint disparada pelo trigger handle_new_user. Sem tradução, a recepção
 * vê uma mensagem em inglês que não diz qual campo está errado.
 */
function traduzirErroCriacao(mensagem: string): string {
  const m = mensagem.toLowerCase()
  if (m.includes('already been registered') || m.includes('already exists')) {
    return 'Já existe um usuário cadastrado com este e-mail.'
  }
  if (m.includes('unable to validate email') || m.includes('invalid format')) {
    return 'E-mail inválido. Verifique o endereço digitado.'
  }
  if (m.includes('without either an email or phone')) {
    return 'Informe um e-mail ou um CPF válido — sem um dos dois não é possível criar o acesso.'
  }
  if (m.includes('database error')) {
    return 'Não foi possível salvar o cadastro: algum campo tem valor inválido (conselho, CBO, UF ou sexo). Revise os dados e tente novamente.'
  }
  return mensagem
}

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

  if (!profile || !['admin', 'recepcao'].includes(profile.role)) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Body inválido' }, { status: 400 })

  const {
    nome, email, role, crefito, cpf_cnpj, paciente_id,
    tipo_profissional, conselho_numero, conselho_uf, cbo_codigo,
    telefone, cep, endereco, numero, complemento, cidade,
    contato_emergencia_nome, contato_emergencia_telefone,
    data_nascimento, rg, sexo, bairro, estado,
  } = body

  if (!role) {
    return NextResponse.json({ error: 'Campos obrigatórios faltando' }, { status: 400 })
  }

  const ROLES_VALIDOS = ['admin', 'recepcao', 'terapeuta', 'pai']
  if (!ROLES_VALIDOS.includes(role)) {
    return NextResponse.json({ error: 'Role inválido' }, { status: 400 })
  }

  const permissoes = (profile.permissoes ?? {}) as Record<string, boolean>
  const podeGerenciarUsuarios = temPermissao(profile.role, permissoes, 'gerenciar_usuarios')
  const podeGerenciarResponsaveis = temPermissao(profile.role, permissoes, 'gerenciar_responsaveis')

  if (!podeGerenciarUsuarios && !(role === 'pai' && podeGerenciarResponsaveis)) {
    return NextResponse.json({ error: 'Sem permissão para criar este tipo de usuário' }, { status: 403 })
  }

  if (profile.role === 'recepcao' && podeGerenciarUsuarios && !['terapeuta', 'pai'].includes(role)) {
    return NextResponse.json({ error: 'Recepção só pode cadastrar profissionais e responsáveis' }, { status: 403 })
  }

  const tipoProfissional = role === 'terapeuta'
    ? (isTipoProfissional(tipo_profissional) ? tipo_profissional : null)
    : null
  const tipoConfig = tipoProfissional ? getTipoProfissionalConfig(tipoProfissional) : null
  const conselhoNumero = typeof conselho_numero === 'string'
    ? conselho_numero.trim()
    : (typeof crefito === 'string' ? crefito.trim() : '')
  const conselhoTipo = tipoConfig?.conselho ?? null
  const conselhoUf = typeof conselho_uf === 'string' && conselho_uf.trim()
    ? conselho_uf.trim().toUpperCase()
    : null
  const cboCodigo = role === 'terapeuta' ? normalizarCodigoCbo(cbo_codigo) : null

  if (role === 'terapeuta' && conselhoUf && !isUfBrasil(conselhoUf)) {
    return NextResponse.json({ error: 'UF do conselho inválida' }, { status: 400 })
  }

  if (cboCodigo && !isCodigoCboValido(cboCodigo)) {
    return NextResponse.json(
      { error: 'Código CBO inválido. Use o formato 0000-00 (ex: 2238-10) ou deixe em branco.' },
      { status: 400 }
    )
  }

  // O trigger handle_new_user só cobre nome NULL; string vazia passa e o perfil
  // fica sem nome, sumindo das buscas da recepção.
  const nomeEfetivo = typeof nome === 'string' && nome.trim() ? nome.trim() : null

  let emailEfetivo = typeof email === 'string' ? email.trim().toLowerCase() : ''
  let semEmail = false

  // E-mail é opcional para todos os perfis, não só para responsáveis: sem este
  // fallback o Supabase recusava a criação com "Cannot create a user without
  // either an email or phone" e a profissional simplesmente não era cadastrada.
  if (!emailEfetivo) {
    const cpfDigits = normalizarCpfCnpj(cpf_cnpj ?? '')
    const telefoneDigits = typeof telefone === 'string' ? telefone.replace(/\D/g, '') : ''
    const temIdentificadorDeLogin =
      cpfDigits.length === 11 || (role === 'pai' && telefoneDigits.length >= 10)

    if (!temIdentificadorDeLogin) {
      return NextResponse.json(
        { error: 'Informe um e-mail ou um CPF — sem um dos dois o usuário não tem como entrar no sistema.' },
        { status: 400 }
      )
    }

    const identificador = cpfDigits.length === 11 ? cpfDigits : crypto.randomUUID().replace(/-/g, '')
    emailEfetivo = gerarEmailInterno(identificador)
    semEmail = true
  }

  const adminClient = createAdminClient()

  const { data: newUser, error: authError } = await adminClient.auth.admin.createUser({
    email: emailEfetivo,
    password: SENHA_PADRAO,
    email_confirm: true,
    user_metadata: {
      nome: nomeEfetivo ?? emailEfetivo,
      role,
      ...(tipoProfissional ? { tipo_profissional: tipoProfissional } : {}),
      ...(conselhoTipo ? { conselho_tipo: conselhoTipo } : {}),
      ...(conselhoNumero ? { conselho_numero: conselhoNumero, crefito: conselhoNumero } : {}),
      ...(conselhoUf ? { conselho_uf: conselhoUf } : {}),
      ...(cboCodigo ? { cbo_codigo: cboCodigo } : {}),
    },
  })

  if (authError) {
    return NextResponse.json({ error: traduzirErroCriacao(authError.message) }, { status: 400 })
  }

  const userId = newUser.user.id
  const cpfCnpjNorm = cpf_cnpj ? normalizarCpfCnpj(cpf_cnpj) : null

  const { error: perfilErro } = await adminClient
    .from('profiles')
    .update({
      ...(nomeEfetivo ? { nome: nomeEfetivo } : {}),
      ...(telefone?.trim() ? { telefone: telefone.trim() } : {}),
      ...(tipoProfissional ? { tipo_profissional: tipoProfissional } : {}),
      ...(conselhoTipo ? { conselho_tipo: conselhoTipo } : {}),
      ...(conselhoNumero ? { conselho_numero: conselhoNumero, crefito: conselhoNumero } : {}),
      conselho_uf: conselhoUf,
      cbo_codigo: cboCodigo,
      ...(cpfCnpjNorm ? { cpf_cnpj: cpfCnpjNorm } : {}),
      ...(role === 'pai' && data_nascimento ? { data_nascimento } : {}),
      ...(role === 'pai' && typeof rg === 'string' && rg.trim() ? { rg: rg.trim() } : {}),
      ...(role === 'pai' && sexo ? { sexo } : {}),
    })
    .eq('id', userId)

  // Sem esta checagem o usuário ficava criado no Auth mas com o perfil vazio —
  // sem nome e sem CPF, ele não aparecia direito na lista nem conseguia entrar
  // pelo CPF, e a tela dizia que tinha dado tudo certo.
  if (perfilErro) {
    await adminClient.auth.admin.deleteUser(userId)
    return NextResponse.json(
      { error: `Não foi possível salvar os dados do cadastro: ${perfilErro.message}` },
      { status: 400 }
    )
  }

  if (role === 'pai') {
    await adminClient.from('responsaveis_detalhes').upsert({
      id: userId,
      telefone_principal: telefone ? telefone.replace(/\D/g, '') : null,
      cep: cep?.replace(/\D/g, '') ?? null,
      endereco: endereco?.trim() ?? null,
      bairro: bairro?.trim() ?? null,
      numero: numero?.trim() ?? null,
      complemento: complemento?.trim() ?? null,
      cidade: cidade?.trim() ?? null,
      estado: estado?.trim() ?? null,
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

  // Também para quem foi cadastrado sem e-mail: o lib devolve o link de
  // definição de senha para a recepção repassar por WhatsApp.
  const convite = await enviarConviteAcesso(adminClient, emailEfetivo)

  return NextResponse.json({
    success: true,
    user_id: userId,
    nome: nomeEfetivo ?? emailEfetivo,
    email: semEmail ? null : emailEfetivo,
    sem_email: semEmail,
    email_enviado: convite.email_enviado,
    ...(convite.email_erro ? { email_erro: convite.email_erro } : {}),
    ...(convite.link_recuperacao ? { link_recuperacao: convite.link_recuperacao } : {}),
  })
}
