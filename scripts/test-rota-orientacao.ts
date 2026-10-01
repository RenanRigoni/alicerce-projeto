/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * A rota PATCH de orientação devolvia { success: true } mesmo quando a RLS descartava o UPDATE
 * (0 linhas afetadas, sem erro). Roda o handler real com um duplo do Supabase que reproduz os
 * dois comportamentos do banco: UPDATE que afeta a linha e UPDATE que afeta zero.
 */
import assert from 'node:assert/strict'
import Module from 'node:module'
import { NextRequest } from 'next/server'

type Resposta = { data: Array<{ id: string }> | null; error: { message: string } | null }
let linhasDoUpdate: Resposta = { data: [], error: null }
let autora = 'ter-1'
let updates = 0

const construtor = () => {
  const q: any = {
    select: () => q,
    eq: () => q,
    single: async () => ({ data: { terapeuta_id: autora, paciente_id: 'pac-1', assinado_em: null }, error: null }),
    update: () => { updates++; return q },
    then: (resolve: (v: Resposta) => void) => resolve(linhasDoUpdate),
  }
  return q
}

const substitutos: Record<string, unknown> = {
  '@/lib/supabase/server': {
    createClient: async () => ({
      auth: { getUser: async () => ({ data: { user: { id: 'ter-1' } } }) },
      from: construtor,
    }),
  },
}
const carregarOriginal = (Module as any)._load
;(Module as any)._load = function (request: string, ...resto: unknown[]) {
  if (request in substitutos) return substitutos[request]
  return carregarOriginal.call(this, request, ...resto)
}

const requisicao = (corpo: unknown) => new NextRequest('http://localhost/api/orientacao/o-1', {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(corpo),
})
const contexto = { params: Promise.resolve({ id: 'o-1' }) }
const corpo = { titulo: 'Exercícios em casa', tipo: 'texto', conteudo: 'Fazer 3x por semana' }

async function main() {
  const { PATCH } = require('../app/api/orientacao/[id]/route')

  // UPDATE descartado pela RLS: 0 linhas, sem erro → a rota NÃO pode dizer que salvou
  linhasDoUpdate = { data: [], error: null }
  let res = await PATCH(requisicao(corpo), contexto)
  const json = await res.json()
  assert.notEqual(json.success, true, 'não pode devolver success:true com 0 linhas afetadas')
  assert.equal(res.status, 403)
  assert.equal(json.error, 'Não foi possível salvar as alterações desta orientação.')
  assert.doesNotMatch(json.error, /rls|policy|pol[ií]tica|row.level/i, 'a mensagem não vaza detalhe de RLS')

  linhasDoUpdate = { data: null, error: null }
  res = await PATCH(requisicao(corpo), contexto)
  assert.equal(res.status, 403, 'data nulo também conta como nada salvo')

  // UPDATE que afetou a linha: sucesso de verdade
  linhasDoUpdate = { data: [{ id: 'o-1' }], error: null }
  res = await PATCH(requisicao(corpo), contexto)
  assert.equal(res.status, 200)
  assert.deepEqual(await res.json(), { success: true })

  // erro do banco continua 500, sem repassar a mensagem
  linhasDoUpdate = { data: null, error: { message: 'permission denied for table orientacoes' } }
  res = await PATCH(requisicao(corpo), contexto)
  assert.equal(res.status, 500)
  assert.equal((await res.json()).error.includes('permission denied'), false)

  // quem não é a autora nem chega no UPDATE
  autora = 'outra-terapeuta'
  updates = 0
  res = await PATCH(requisicao(corpo), contexto)
  assert.equal(res.status, 403)
  assert.equal(updates, 0)
  autora = 'ter-1'

  // título vazio continua barrado antes de qualquer escrita
  updates = 0
  res = await PATCH(requisicao({ ...corpo, titulo: '  ' }), contexto)
  assert.equal(res.status, 400)
  assert.equal(updates, 0)

  console.log('Rota de orientação: testes passaram')
}

main().catch(erro => { console.error(erro); process.exit(1) })
