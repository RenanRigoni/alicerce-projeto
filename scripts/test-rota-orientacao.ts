/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Orientação não se altera nem se exclui depois de criada: as duas rotas recusam com 409.
 *
 * O que estes testes protegem, e por quê: a rota PATCH antes montava um UPDATE e devolvia
 * { success: true } mesmo quando a RLS descartava a escrita (0 linhas, sem erro). A orientação
 * nasce assinada e a família é notificada no mesmo instante (`app/api/orientacao/route.ts`),
 * e a tabela não guarda versão anterior — então editar era mudar documento assinado e entregue
 * sem deixar rastro, o oposto do que a Lei 13.787/2018 e a LGPD art. 18 pedem. Qualquer
 * regressão que faça a rota escrever de novo tem de quebrar aqui.
 */
import assert from 'node:assert/strict'
import { NextRequest } from 'next/server'

const corpo = { titulo: 'Exercícios em casa', tipo: 'texto', conteudo: 'Fazer 3x por semana' }
const requisicao = (metodo: string) => new NextRequest('http://localhost/api/orientacao/o-1', {
  method: metodo,
  headers: { 'Content-Type': 'application/json' },
  body: metodo === 'DELETE' ? undefined : JSON.stringify(corpo),
})
const contexto = { params: Promise.resolve({ id: 'o-1' }) }

async function main() {
  const rota = require('../app/api/orientacao/[id]/route')

  // ── PATCH recusa ──
  const resPatch = await rota.PATCH(requisicao('PATCH'), contexto)
  const jsonPatch = await resPatch.json()
  assert.equal(resPatch.status, 409)
  assert.notEqual(jsonPatch.success, true, 'nunca pode dizer que salvou')
  assert.match(jsonPatch.error, /nova orienta/i, 'a mensagem diz o que fazer no lugar')
  assert.doesNotMatch(jsonPatch.error, /rls|policy|pol[ií]tica|row.level/i, 'sem detalhe de RLS')

  // ── DELETE recusa ──
  const resDelete = await rota.DELETE(requisicao('DELETE'), contexto)
  const jsonDelete = await resDelete.json()
  assert.equal(resDelete.status, 409)
  assert.notEqual(jsonDelete.success, true)
  assert.match(jsonDelete.error, /COFFITO/, 'a mensagem cita a norma')

  // ── nenhuma das duas toca o banco ──
  // Se alguém voltar a montar um UPDATE aqui, o módulo passa a importar o cliente do Supabase.
  // Sem import, não há como escrever: é a garantia mais forte que dá para fazer sem banco.
  const fonte = require('node:fs').readFileSync('app/api/orientacao/[id]/route.ts', 'utf8')
  assert.equal(/supabase/i.test(fonte), false, 'a rota não deve mais falar com o banco')
  assert.equal(/\.update\(|\.insert\(|\.upsert\(|\.delete\(/.test(fonte), false, 'nenhuma escrita')
  assert.equal(/gerarHash/.test(fonte), false, 'sem recalcular hash: não há o que assinar de novo')

  // ── a tela não oferece mais o botão ──
  const tela = require('node:fs').readFileSync('components/paciente/PerfilPacienteTabs.tsx', 'utf8')
  assert.equal(/editandoOri/.test(tela), false, 'o modal de editar orientação saiu da tela')
  assert.equal(
    /method: 'PATCH'[\s\S]{0,400}orientacao/.test(tela),
    false,
    'nada na tela chama PATCH de orientação',
  )

  // ── o botão Excluir mostra o motivo em vez de recarregar calado ──
  assert.match(tela, /erroExcluirOri/, 'a recusa do Excluir aparece na lista')

  console.log('Rota de orientação: testes passaram')
}

main().catch(erro => { console.error(erro); process.exit(1) })
