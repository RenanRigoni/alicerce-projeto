import assert from 'node:assert/strict'
import {
  indexarRetificacoes,
  podeRetificar,
  rotuloDaOriginal,
  tituloSugeridoDaRetificacao,
  type EvolucaoRetificavel,
} from '../lib/paciente/retificacao'

const evo = (id: string, dia: string, extra: Partial<EvolucaoRetificavel> = {}): EvolucaoRetificavel => ({
  id,
  criado_em: `2026-10-${dia}T12:00:00.000Z`,
  status: 'publicado',
  ...extra,
})

// ── rótulo ──
assert.equal(rotuloDaOriginal(evo('a', '01')), 'evolução de 01/10/2026')
assert.equal(rotuloDaOriginal({ id: 'a', criado_em: 'nao-e-data' }), 'evolução anterior')

// ── quem retifica quem ──
const original = evo('orig', '01', { identificacao: 'Sessão de maio' })
const retificacao = evo('ret', '05', { retifica_id: 'orig' })
let indice = indexarRetificacoes([original, retificacao])

assert.equal(indice.get('ret')!.retifica?.id, 'orig')
assert.equal(indice.get('ret')!.retifica?.rotulo, 'evolução de 01/10/2026')
assert.deepEqual(indice.get('ret')!.retificadaPor, [])

assert.equal(indice.get('orig')!.retifica, null)
assert.equal(indice.get('orig')!.retificadaPor.length, 1, 'a original sabe que foi retificada')
assert.equal(indice.get('orig')!.retificadaPor[0].id, 'ret')
assert.equal(indice.get('orig')!.retificadaPor[0].rotulo, 'evolução de 05/10/2026')

// ── a original NÃO é apagada nem escondida: continua no índice ──
assert.ok(indice.has('orig'), 'a evolução retificada permanece no prontuário')

// ── cadeia: retificação de retificação ──
const segunda = evo('ret2', '09', { retifica_id: 'ret' })
indice = indexarRetificacoes([original, retificacao, segunda])
assert.equal(indice.get('ret2')!.retifica?.id, 'ret')
assert.equal(indice.get('ret')!.retificadaPor[0].id, 'ret2', 'o elo do meio é original e retificação')
assert.equal(indice.get('ret')!.retifica?.id, 'orig')
assert.equal(indice.get('orig')!.retificadaPor.length, 1, 'a cadeia não duplica o elo da ponta')

// ── duas retificações da mesma evolução ──
indice = indexarRetificacoes([original, retificacao, evo('ret3', '10', { retifica_id: 'orig' })])
assert.equal(indice.get('orig')!.retificadaPor.length, 2)

// ── elo fora da lista (busca filtrada) não quebra nem inventa rótulo ──
indice = indexarRetificacoes([evo('sozinha', '05', { retifica_id: 'nao-esta-na-lista' })])
assert.equal(indice.get('sozinha')!.retifica, null, 'sem a original na lista, nenhum rótulo é inventado')
assert.deepEqual(indice.get('sozinha')!.retificadaPor, [])

// ── lista vazia e sem retificação ──
assert.equal(indexarRetificacoes([]).size, 0)
indice = indexarRetificacoes([evo('a', '01'), evo('b', '02')])
assert.equal(indice.get('a')!.retifica, null)
assert.deepEqual(indice.get('b')!.retificadaPor, [])

// ── retifica_id nulo e ausente são iguais ──
assert.equal(indexarRetificacoes([evo('x', '01', { retifica_id: null })]).get('x')!.retifica, null)

// ── só publicada se retifica ──
assert.equal(podeRetificar(evo('a', '01', { status: 'publicado' })), true)
assert.equal(podeRetificar(evo('a', '01', { status: 'rascunho' })), false, 'rascunho se corrige editando')
assert.equal(podeRetificar({ id: 'a', criado_em: '2026-10-01T12:00:00.000Z' }), false, 'sem status, não')

// ── título sugerido ──
assert.equal(tituloSugeridoDaRetificacao(original), 'Retificação — Sessão de maio')
assert.equal(tituloSugeridoDaRetificacao(evo('a', '01')), 'Retificação da evolução de 01/10/2026')
assert.equal(
  tituloSugeridoDaRetificacao(evo('a', '01', { identificacao: '   ' })),
  'Retificação da evolução de 01/10/2026',
  'título só com espaço conta como vazio',
)

console.log('test:retificacao OK')
