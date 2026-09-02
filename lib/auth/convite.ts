import type { SupabaseClient } from '@supabase/supabase-js'

export const DOMINIO_EMAIL_INTERNO = 'noemail.alicerce.app'

export type ModoConvite = 'email' | 'link'

export interface ResultadoConvite {
  email_enviado: boolean
  email_erro: string | null
  link_recuperacao: string | null
}

export function isEmailInterno(email: string): boolean {
  return email.endsWith(`@${DOMINIO_EMAIL_INTERNO}`)
}

export function temEmailReal(email: string | null | undefined): boolean {
  return !!email && !isEmailInterno(email)
}

function redirectTo(): string {
  return `${process.env.NEXT_PUBLIC_APP_URL}/atualizar-senha`
}

/**
 * Gera o link direto de definição de senha, sem enviar e-mail.
 * Atenção: gerar um link novo invalida qualquer link anterior do mesmo usuário
 * (Supabase guarda um único recovery_token por usuário).
 */
async function gerarLink(
  adminClient: SupabaseClient,
  email: string
): Promise<string | null> {
  try {
    const { data } = await adminClient.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: { redirectTo: redirectTo() },
    })
    return data?.properties?.action_link ?? null
  } catch {
    return null
  }
}

/**
 * Envia o convite de acesso (definição de senha).
 *
 * modo 'email': tenta enviar pelo Supabase. Só gera link manual se o envio falhar,
 *   porque gerar link invalidaria o token do e-mail recém-enviado.
 * modo 'link': não envia e-mail, apenas devolve o link para repasse manual
 *   (WhatsApp, presencialmente, etc).
 */
export async function enviarConviteAcesso(
  adminClient: SupabaseClient,
  email: string,
  modo: ModoConvite = 'email'
): Promise<ResultadoConvite> {
  if (!temEmailReal(email)) {
    return {
      email_enviado: false,
      email_erro: null,
      link_recuperacao: email ? await gerarLink(adminClient, email) : null,
    }
  }

  if (modo === 'link') {
    return {
      email_enviado: false,
      email_erro: null,
      link_recuperacao: await gerarLink(adminClient, email),
    }
  }

  let emailErro: string | null = null
  try {
    const { error } = await adminClient.auth.resetPasswordForEmail(email, {
      redirectTo: redirectTo(),
    })
    if (!error) {
      return { email_enviado: true, email_erro: null, link_recuperacao: null }
    }
    emailErro = error.message
  } catch (e) {
    emailErro = e instanceof Error ? e.message : 'Falha desconhecida ao enviar e-mail'
  }

  return {
    email_enviado: false,
    email_erro: emailErro,
    link_recuperacao: await gerarLink(adminClient, email),
  }
}
