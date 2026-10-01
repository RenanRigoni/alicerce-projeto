import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  COLUNAS_DADOS_CLINICOS,
  colunasDesconhecidas,
  montarPayloadDadosClinicos,
  type CamposDadosClinicos,
} from '../lib/paciente/dados-clinicos'

const contexto = {
  pacienteId: '11111111-1111-1111-1111-111111111111',
  agora: '2026-10-01T12:00:00.000Z',
  usuarioId: '22222222-2222-2222-2222-222222222222',
}

// ── o bug que deixou a ficha inútil: uma coluna a mais derruba o upsert inteiro ──
// O PostgREST valida as chaves contra o cache de schema ANTES de tocar o banco e devolve
// 400 PGRST204, então o salvamento falha por completo — não é o campo extra que se perde.
assert.deepEqual(
  colunasDesconhecidas({ paciente_id: 'x', diagnostico: 'y', hash_integridade: 'abc' }),
  ['hash_integridade'],
  'hash_integridade não existe em pacientes_dados_clinicos e precisa ser detectada',
)
assert.deepEqual(colunasDesconhecidas({ paciente_id: 'x', diagnostico: 'y' }), [])
assert.deepEqual(colunasDesconhecidas({}), [])

// ── o payload que a tela manda não inventa coluna ──
const fichaCheia: CamposDadosClinicos = {
  hipotese_diagnostica: 'a', diagnostico: 'b', objetivos_terapeuticos: 'c',
  plano_terapeutico: 'd', demandas_prioritarias: 'e', data_avaliacao_inicial: '2026-03-15',
  obs_clinicas_gerais: 'f', estrategias_utilizadas: 'g', orientacoes_para_casa: 'h',
  evolucao_resumida: 'i', metas_curto_prazo: 'j', metas_medio_prazo: 'k',
  sensibilidades_restricoes: 'l', nivel_suporte: 'm', obs_comportamento_regulacao: 'n',
  informacoes_escolares: 'o', pontos_atencao_equipe: 'p',
}
assert.deepEqual(colunasDesconhecidas(montarPayloadDadosClinicos(fichaCheia, contexto)), [])
assert.deepEqual(colunasDesconhecidas(montarPayloadDadosClinicos({}, contexto)), [])

const payload = montarPayloadDadosClinicos(fichaCheia, contexto)
assert.equal(payload.paciente_id, contexto.pacienteId, 'a chave do upsert vai no payload')
assert.equal(payload.atualizado_em, contexto.agora)
assert.equal(payload.atualizado_por, contexto.usuarioId)
assert.equal('hash_integridade' in payload, false)

// Campos vazios viram null explícito: apagar um campo tem de apagar no banco, não ser ignorado.
const apagado = montarPayloadDadosClinicos({ diagnostico: null }, contexto)
assert.equal(apagado.diagnostico, null)
assert.ok('diagnostico' in apagado, 'null vai no payload em vez de sumir da chamada')

// `paciente_id` não é sobrescrevível por campo da ficha: a chave do upsert vem do contexto.
const tentativaDeTroca = montarPayloadDadosClinicos(
  { paciente_id: '99999999-9999-9999-9999-999999999999' } as unknown as CamposDadosClinicos,
  contexto,
)
assert.equal(tentativaDeTroca.paciente_id, contexto.pacienteId)

// ── a lista de colunas espelha a tabela de produção (conferida por MCP em 01/10/2026) ──
const COLUNAS_EM_PRODUCAO = [
  'paciente_id', 'hipotese_diagnostica', 'diagnostico', 'objetivos_terapeuticos',
  'plano_terapeutico', 'demandas_prioritarias', 'data_avaliacao_inicial', 'obs_clinicas_gerais',
  'estrategias_utilizadas', 'orientacoes_para_casa', 'evolucao_resumida', 'metas_curto_prazo',
  'metas_medio_prazo', 'sensibilidades_restricoes', 'nivel_suporte', 'obs_comportamento_regulacao',
  'informacoes_escolares', 'pontos_atencao_equipe', 'atualizado_em', 'atualizado_por',
]
assert.deepEqual([...COLUNAS_DADOS_CLINICOS].sort(), [...COLUNAS_EM_PRODUCAO].sort())

// ── a tela usa a função e não remonta o payload à mão ──
const telaFonte = readFileSync('components/paciente/AbaDadosClinicos.tsx', 'utf8')
assert.ok(
  telaFonte.includes('montarPayloadDadosClinicos'),
  'AbaDadosClinicos precisa montar o payload por aqui, senão a guarda não vale',
)
// Só o código conta: o comentário que explica o bug cita o nome da coluna de propósito.
const telaSemComentarios = telaFonte.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
assert.equal(
  /hash_integridade/.test(telaSemComentarios),
  false,
  'hash_integridade de volta na tela = todo salvamento da ficha volta a falhar com PGRST204',
)

// ── os 17 campos da tela são colunas de verdade ──
const camposDaTela = [...telaFonte.matchAll(/\{ key: '(\w+)',\s+label/g)].map(m => m[1])
assert.equal(camposDaTela.length, 17, '17 campos na ficha')
const conhecidas = new Set<string>(COLUNAS_DADOS_CLINICOS)
for (const campo of camposDaTela) {
  assert.ok(conhecidas.has(campo), `campo "${campo}" da tela não é coluna de pacientes_dados_clinicos`)
}

console.log('test:dados-clinicos OK')
