/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Relatório PUBLICADO não se apaga: foi emitido e entregue, e a cópia do documento tem de ficar
 * arquivada (a família leva para a escola, para o plano, para o INSS, e a guarda responde a
 * profissional junto com a clínica). Rascunho nunca saiu da clínica e a autora apaga o dela.
 *
 * Roda os handlers reais. A policy "relatorios: exclusão terapeuta" é a tranca de verdade — este
 * teste guarda a camada da rota, que é a que dá a mensagem e é a que alguém esquece de atualizar.
 */
import assert from 'node:assert/strict'
import Module from 'node:module'
import { NextRequest } from 'next/server'

type Resposta = { data: Array<{ id: string }> | null; error: { message: string } | null }
let linhasAfetadas: Resposta = { data: [{ id: 'r-1' }], error: null }
let autor = 'ter-1'
let status = 'rascunho'
let papel = 'terapeuta'
let escritas = 0

const construtor = (tabela: string) => {
  const q: any = {
    select: () => q,
    eq: () => q,
    single: async () =>
      tabela === 'profiles'
        ? { data: { role: papel }, error: null }
        : { data: { id: 'r-1', terapeuta_id: autor, status }, error: null },
    update: () => { escritas++; return q },
    delete: () => { escritas++; return q },
    then: (resolve: (v: Resposta) => void) => resolve(linhasAfetadas),
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

const req = () => new NextRequest('http://localhost/api/relatorio/r-1', { method: 'DELETE' })
const contexto = { params: Promise.resolve({ id: 'r-1' }) }

function reset() {
  autor = 'ter-1'
  status = 'rascunho'
  papel = 'terapeuta'
  escritas = 0
  linhasAfetadas = { data: [{ id: 'r-1' }], error: null }
}

async function main() {
  const { DELETE } = require('../app/api/relatorio/[id]/route')

  // autora apaga o rascunho dela
  reset()
  let res = await DELETE(req(), contexto)
  assert.equal(res.status, 200, 'autora apaga rascunho')
  assert.deepEqual(await res.json(), { success: true })
  assert.equal(escritas, 1)

  // PUBLICADO não se apaga, e nem chega no banco
  reset()
  status = 'publicado'
  res = await DELETE(req(), contexto)
  let json = await res.json()
  assert.equal(res.status, 409, 'publicado é recusado')
  assert.equal(escritas, 0, 'nem tentou apagar')
  assert.notEqual(json.success, true)
  assert.match(json.error, /arquivada|publicado/i, 'a mensagem diz por que não dá')
  assert.match(json.error, /novo relat/i, 'e diz o que fazer no lugar')

  // só quem escreveu
  reset()
  autor = 'outra-terapeuta'
  res = await DELETE(req(), contexto)
  json = await res.json()
  assert.equal(res.status, 403)
  assert.equal(escritas, 0)
  assert.match(json.error, /quem escreveu/i)

  // quem não é profissional não passa
  reset()
  papel = 'recepcao'
  res = await DELETE(req(), contexto)
  assert.equal(res.status, 403)
  assert.equal(escritas, 0)

  // 0 linhas afetadas, sem erro: NÃO pode dizer que apagou
  reset()
  linhasAfetadas = { data: [], error: null }
  res = await DELETE(req(), contexto)
  json = await res.json()
  assert.notEqual(json.success, true, '0 linhas não é sucesso')
  assert.equal(res.status, 409)
  assert.match(json.error, /alta|somente leitura/i, 'explica a causa provável')
  assert.doesNotMatch(json.error, /rls|policy|pol[ií]tica|row.level/i)

  reset()
  linhasAfetadas = { data: null, error: null }
  res = await DELETE(req(), contexto)
  assert.equal(res.status, 409, 'data nulo também conta como nada apagado')

  // erro do banco: 500 sem vazar a mensagem crua
  reset()
  linhasAfetadas = { data: null, error: { message: 'permission denied for table relatorios' } }
  res = await DELETE(req(), contexto)
  assert.equal(res.status, 500)
  assert.equal((await res.json()).error.includes('permission denied'), false)

  // ── a tela só oferece o botão em rascunho, e mostra o motivo quando a rota recusa ──
  const tela = require('node:fs').readFileSync('components/paciente/PerfilPacienteTabs.tsx', 'utf8')
  assert.match(tela, /erroExcluirRel/, 'a recusa aparece na lista de relatórios')
  assert.match(
    tela,
    /r\.status === 'rascunho' && paciente\.status === 'ativo'[\s\S]{0,400}handleDeletarRelatorio/,
    'o botão Excluir de relatório só existe para rascunho de paciente ativo',
  )

  console.log('Rota de relatório: testes passaram')
}

main().catch(erro => { console.error(erro); process.exit(1) })
