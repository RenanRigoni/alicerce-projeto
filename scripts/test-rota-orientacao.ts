/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Orientação é dica para o responsável: a autora edita e apaga as dela. As duas rotas conferem
 * a autoria, recusam depois da alta e — o que importa de verdade — leem quantas linhas o banco
 * mexeu. Sob RLS, uma escrita barrada afeta 0 linhas SEM erro, e sem `.select()` a rota
 * respondia { success: true } sem ter salvo nem apagado nada.
 *
 * Roda os handlers reais com um duplo do Supabase que reproduz os dois comportamentos do banco.
 */
import assert from 'node:assert/strict'
import Module from 'node:module'
import { NextRequest } from 'next/server'

type Resposta = { data: Array<{ id: string }> | null; error: { message: string } | null }
let linhasAfetadas: Resposta = { data: [{ id: 'o-1' }], error: null }
let autora = 'ter-1'
let statusPaciente = 'ativo'
let escritas = 0

const construtor = () => {
  const q: any = {
    select: () => q,
    eq: () => q,
    single: async () => ({
      data: { terapeuta_id: autora, paciente_id: 'pac-1', assinado_em: null, pacientes: { status: statusPaciente } },
      error: null,
    }),
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

const corpo = { titulo: 'Exercícios em casa', tipo: 'texto', conteudo: 'Fazer 3x por semana' }
const req = (metodo: 'PATCH' | 'DELETE', body: unknown = corpo) =>
  new NextRequest('http://localhost/api/orientacao/o-1', {
    method: metodo,
    headers: { 'Content-Type': 'application/json' },
    ...(metodo === 'PATCH' ? { body: JSON.stringify(body) } : {}),
  })
const contexto = { params: Promise.resolve({ id: 'o-1' }) }

function reset() {
  autora = 'ter-1'
  statusPaciente = 'ativo'
  escritas = 0
  linhasAfetadas = { data: [{ id: 'o-1' }], error: null }
}

async function main() {
  const { PATCH, DELETE } = require('../app/api/orientacao/[id]/route')

  for (const [nome, chamar] of [
    ['PATCH', () => PATCH(req('PATCH'), contexto)],
    ['DELETE', () => DELETE(req('DELETE'), contexto)],
  ] as const) {
    // caminho bom: a autora mexe na linha
    reset()
    let res = await chamar()
    assert.equal(res.status, 200, `${nome}: autora com paciente ativo salva`)
    assert.deepEqual(await res.json(), { success: true })
    assert.equal(escritas, 1)

    // 0 linhas afetadas, sem erro: NÃO pode dizer que deu certo
    reset()
    linhasAfetadas = { data: [], error: null }
    res = await chamar()
    let json = await res.json()
    assert.notEqual(json.success, true, `${nome}: 0 linhas não é sucesso`)
    assert.equal(res.status, 403)
    assert.doesNotMatch(json.error, /rls|policy|pol[ií]tica|row.level/i, `${nome}: sem detalhe de RLS`)

    reset()
    linhasAfetadas = { data: null, error: null }
    res = await chamar()
    assert.equal(res.status, 403, `${nome}: data nulo também conta como nada feito`)

    // erro do banco: 500 sem repassar a mensagem crua
    reset()
    linhasAfetadas = { data: null, error: { message: 'permission denied for table orientacoes' } }
    res = await chamar()
    assert.equal(res.status, 500, `${nome}: erro do banco é 500`)
    assert.equal((await res.json()).error.includes('permission denied'), false)

    // quem não escreveu não chega na escrita
    reset()
    autora = 'outra-terapeuta'
    res = await chamar()
    json = await res.json()
    assert.equal(res.status, 403, `${nome}: só a autora`)
    assert.equal(escritas, 0, `${nome}: nem tentou escrever`)
    assert.match(json.error, /quem escreveu/i)

    // prontuário encerrado barra antes da escrita
    reset()
    statusPaciente = 'inativo'
    res = await chamar()
    json = await res.json()
    assert.equal(res.status, 409, `${nome}: paciente inativo é 409`)
    assert.equal(escritas, 0, `${nome}: nem tentou escrever`)
    assert.match(json.error, /encerrado|somente leitura/i)
  }

  // título vazio barra antes de qualquer escrita (só no PATCH)
  reset()
  const res = await PATCH(req('PATCH', { ...corpo, titulo: '   ' }), contexto)
  assert.equal(res.status, 400)
  assert.equal(escritas, 0)

  // ── a tela mostra o motivo quando o Excluir falha ──
  const tela = require('node:fs').readFileSync('components/paciente/PerfilPacienteTabs.tsx', 'utf8')
  assert.match(tela, /erroExcluirOri/, 'a recusa do Excluir aparece na lista, não só um refresh calado')
  assert.match(tela, /setErroExcluirOri/, 'o handler grava o motivo')

  // ── evolução e relatório também não podem dizer "salvo" sem ter salvo ──
  // Os comentários dessas rotas citam `.select('id')` ao explicar o bug, então a asserção tem de
  // olhar só o código — senão ela passa com o comentário e a chamada de verdade removida.
  const semComentarios = (texto: string) =>
    texto.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

  for (const arquivo of ['app/api/evolucao/[id]/route.ts', 'app/api/relatorio/[id]/route.ts']) {
    const codigo = semComentarios(require('node:fs').readFileSync(arquivo, 'utf8'))
    assert.match(
      codigo,
      /\.update\(\{[\s\S]*?\}\)\s*\.eq\([^)]*\)\s*\.select\(/,
      `${arquivo}: o UPDATE precisa terminar em .select(), senão 0 linhas passam por sucesso`,
    )
    assert.match(codigo, /length === 0/, `${arquivo}: precisa tratar 0 linhas afetadas`)
    // Evolução não se apaga: nem rota de DELETE existe.
    if (arquivo.includes('evolucao')) {
      assert.equal(/export async function DELETE/.test(codigo), false, 'evolução não tem rota de exclusão')
    }
  }

  console.log('Rota de orientação: testes passaram')
}

main().catch(erro => { console.error(erro); process.exit(1) })
