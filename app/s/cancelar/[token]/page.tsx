import { lerEstadoLink } from '@/lib/sessao/confirmacao'
import { responderSessao } from '@/app/s/acoes'
import { ResultadoSessao } from '@/app/s/_componentes/ResultadoSessao'
import { TelaSessao } from '@/app/s/_componentes/TelaSessao'

interface Props {
  params: Promise<{ token: string }>
}

// Abrir o link apenas mostra a sessão. Cancelar exige o POST do formulário.
export default async function CancelarPage({ params }: Props) {
  const { token } = await params
  const estado = await lerEstadoLink(token, 'cancelar')

  if (estado.tipo === 'resultado') {
    return <ResultadoSessao resultado={estado.resultado} sessao={estado.sessao} />
  }

  return (
    <TelaSessao
      acao="cancelar"
      sessao={estado.sessao}
      responder={responderSessao.bind(null, token, 'cancelar')}
    />
  )
}
