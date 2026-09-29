import { lerEstadoLink } from '@/lib/sessao/confirmacao'
import { responderSessao } from '@/app/s/acoes'
import { ResultadoSessao } from '@/app/s/_componentes/ResultadoSessao'
import { TelaSessao } from '@/app/s/_componentes/TelaSessao'

interface Props {
  params: Promise<{ token: string }>
}

// Abrir o link apenas mostra a sessão. Confirmar exige o POST do formulário.
export default async function ConfirmarPage({ params }: Props) {
  const { token } = await params
  const estado = await lerEstadoLink(token, 'confirmar')

  if (estado.tipo === 'resultado') {
    return <ResultadoSessao resultado={estado.resultado} sessao={estado.sessao} />
  }

  return (
    <TelaSessao
      acao="confirmar"
      sessao={estado.sessao}
      responder={responderSessao.bind(null, token, 'confirmar')}
    />
  )
}
