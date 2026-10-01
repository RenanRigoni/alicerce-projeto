import { NextResponse } from 'next/server'

// Orientação não se altera nem se exclui depois de criada. As duas rotas recusam, e o botão
// "Editar" saiu da tela (components/paciente/PerfilPacienteTabs.tsx). Corrigir = nova orientação.
//
// Por quê, em ordem de peso:
//
// 1. A orientação nasce assinada. `app/api/orientacao/route.ts` grava `assinado_em: agora` no
//    próprio INSERT e, na mesma requisição, notifica os responsáveis. Não existe rascunho:
//    quando a terapeuta vê a orientação na lista, a família já foi avisada e já pode ter lido.
//    Editar depois disso é mudar um documento assinado e entregue.
//
// 2. A Lei 13.787/2018 (prontuário digital) e a LGPD (art. 18, retificação) não proíbem
//    corrigir — exigem que a correção deixe rastro: quem alterou, quando, e a versão anterior
//    tem de sobreviver. `orientacoes` não guarda versão: o UPDATE sobrescrevia `titulo` e
//    `conteudo` e recalculava `hash_integridade`, apagando o original sem deixar sinal. A
//    integridade por hash funciona ao contrário disso: qualquer alteração posterior à
//    assinatura invalida o resumo. Permitir a edição sem versionamento era o oposto da regra.
//    (COFFITO 414/2012 e 424/2013 são silenciosas sobre correção de registro.)
//
// 3. O UPDATE nunca funcionou. `orientacoes` não tem policy PERMISSIVE de UPDATE para
//    terapeuta — só a RESTRICTIVE pós-alta, que restringe sem conceder. Sob RLS, sem nenhuma
//    PERMISSIVE que case, não há permissão: o UPDATE afetava 0 linhas SEM erro e a rota
//    respondia `{ success: true }` sem ter salvo nada. Nenhuma orientação foi editada na
//    prática; a tela só dizia que sim.
//
// Se um dia a edição voltar, o caminho é rascunho, não policy de UPDATE: criar sem assinar e
// sem notificar, e um "Publicar" que assina e notifica. Aí a edição acontece antes da
// assinatura e o rastro não é necessário.

const MOTIVO_IMUTAVEL =
  'O prontuário é imutável depois de criado (COFFITO Res. 424/2013). ' +
  'Para corrigir, registre uma nova orientação.'

export async function PATCH() {
  return NextResponse.json({ error: MOTIVO_IMUTAVEL }, { status: 409 })
}

export async function DELETE() {
  return NextResponse.json(
    { error: 'Orientações não podem ser excluídas após criação. ' + MOTIVO_IMUTAVEL },
    { status: 409 }
  )
}
