import { resend, EMAIL_FROM } from './client'
import {
  templateBoasVindas,
  templateAltaConfirmada,
  templateComunicado,
} from './templates'

type ResultadoEmail = { id: string } | null

async function enviar(params: {
  para: string | string[]
  assunto: string
  html: string
  idempotencyKey?: string
}): Promise<ResultadoEmail> {
  const { data, error } = await resend.emails.send(
    {
      from: EMAIL_FROM,
      to: Array.isArray(params.para) ? params.para : [params.para],
      subject: params.assunto,
      html: params.html,
    },
    params.idempotencyKey ? { idempotencyKey: params.idempotencyKey } : undefined
  )

  if (error) {
    console.error('[email] erro ao enviar:', params.assunto, error.message)
    return null
  }

  return data
}

export async function emailBoasVindas(
  para: string,
  nome: string
): Promise<ResultadoEmail> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
  return enviar({
    para,
    assunto: 'Bem-vindo ao Alicerce',
    html: templateBoasVindas(nome, `${appUrl}/login`),
    idempotencyKey: `boas-vindas/${para}`,
  })
}

export async function emailAltaConfirmada(
  para: string,
  nomeResponsavel: string,
  nomePaciente: string,
  altaId: string
): Promise<ResultadoEmail> {
  return enviar({
    para,
    assunto: `Alta confirmada — ${nomePaciente}`,
    html: templateAltaConfirmada(nomeResponsavel, nomePaciente),
    idempotencyKey: `alta-confirmada/${altaId}`,
  })
}

export async function emailComunicado(
  para: string | string[],
  titulo: string,
  corpo: string
): Promise<ResultadoEmail> {
  return enviar({
    para,
    assunto: titulo,
    html: templateComunicado(titulo, corpo),
  })
}
