import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  FILTROS_RESPONSAVEL, casaComFiltro, contarProblemas, diagnosticarContato, lerFiltroResponsavel, linhasDoPainel,
  pacientesAtivosSemResponsavel, type ContatoResponsavel,
} from '../lib/qualidade-dados/responsaveis'

const contato = (parcial: Partial<ContatoResponsavel> = {}): ContatoResponsavel => ({
  id: 'r1', telefone_perfil: null, telefone_principal: null, cep: null, ...parcial,
})
const ruim = (parcial: Partial<ContatoResponsavel>) => diagnosticarContato(contato(parcial)).telefoneRuim

// ── um caso de cada categoria da classificação (item 5a) ──
assert.equal(ruim({}), false, 'vazio: telefone é opcional, não é problema')
assert.equal(ruim({ telefone_perfil: '', telefone_principal: '   ' }), false, 'em branco também')
assert.equal(ruim({ telefone_principal: '34998822549' }), false, 'celular OK (11 dígitos, 3º = 9)')
assert.equal(ruim({ telefone_perfil: '(34) 99882-2549' }), false, 'celular formatado OK')
assert.equal(ruim({ telefone_principal: '3488126967' }), true, 'celular sem o nono dígito (10 dígitos, número começa com 8)')
assert.equal(ruim({ telefone_perfil: '(34) 9159-9591' }), true, 'celular sem o nono dígito (começa com 9)')
assert.equal(ruim({ telefone_perfil: '34 998864 9617' }), true, '12 dígitos: tamanho inválido')
assert.equal(ruim({ telefone_principal: '349988' }), true, 'incompleto: tamanho inválido')
assert.equal(ruim({ telefone_principal: '34388126967' }), true, '11 dígitos com 3º ≠ 9: suspeito')

// FIXO VÁLIDO NÃO É ERRO: a clínica é 100% celular hoje, mas telefone de consultório é legítimo
for (const fixo of ['3433334444', '(34) 3333-4444', '3423334444', '3453334444']) {
  const d = diagnosticarContato(contato({ telefone_principal: fixo }))
  assert.equal(d.telefoneRuim, false, `fixo ${fixo} não é problema`)
  assert.deepEqual(d.motivos, [], `fixo ${fixo} não gera motivo`)
}
assert.deepEqual(contarProblemas([contato({ telefone_perfil: '3433334444', telefone_principal: '3433334444' })]),
  { responsaveis: 1, telefoneRuim: 0, telefoneDivergente: 0, cepIncompleto: 0 })

// qualquer um dos dois campos basta; quem está ruim nos dois conta UMA vez (pessoas, não campos)
assert.deepEqual(contarProblemas([
  contato({ id: 'a', telefone_perfil: '34998822549', telefone_principal: '3488126967' }), // só um ruim
  contato({ id: 'b', telefone_perfil: '3488126967', telefone_principal: '3488126967' }), // os dois ruins
  contato({ id: 'c', telefone_perfil: '34998822549', telefone_principal: '34998822549' }), // limpo
]), { responsaveis: 3, telefoneRuim: 2, telefoneDivergente: 1, cepIncompleto: 0 })

// ── telefone divergente entre os dois cadastros ──
const div = (a: string | null, b: string | null) => diagnosticarContato(contato({ telefone_perfil: a, telefone_principal: b })).telefoneDivergente
assert.equal(div('34998822549', '34991112233'), true, 'dois celulares válidos e diferentes')
assert.equal(div('(34) 99882-2549', '34998822549'), false, 'mesmo número, um formatado e outro não, NÃO diverge')
assert.equal(div('34998822549', null), false, 'só um preenchido: não há com o que divergir')
assert.equal(div(null, '34998822549'), false)
assert.equal(div('', '  '), false)
assert.equal(div('3488126967', '34988126967'), true, 'com e sem o nono dígito são diferentes')
assert.equal(diagnosticarContato(contato({ telefone_perfil: '34998822549', telefone_principal: '34991112233' })).telefoneRuim, false,
  'divergente não é, por si, telefone ruim')

// ── CEP ──
const cep = (v: string | null) => diagnosticarContato(contato({ cep: v })).cepIncompleto
assert.equal(cep(null), false, 'sem CEP: opcional')
assert.equal(cep(''), false, 'CEP vazio é válido (a string vazia está em 77 linhas de produção)')
assert.equal(cep('38744538'), false)
assert.equal(cep('38744-538'), false, 'com hífen')
assert.equal(cep('38742-24'), true, 'o valor real malformado: 7 dígitos')
assert.equal(cep('387425401'), true, '9 dígitos')
assert.equal(cep('abc'), true, 'sem dígitos')

// ── a lista filtrada de /admin/responsaveis e a contagem do painel são a mesma conta ──
const amostra = [
  contato({ id: 'a', telefone_perfil: '3488126967', telefone_principal: '34998822549' }),
  contato({ id: 'b', telefone_perfil: '34998864961', telefone_principal: '34991112233' }),
  contato({ id: 'c', telefone_perfil: '349988649617', telefone_principal: '349988649617', cep: '38742-24' }),
  contato({ id: 'd', telefone_principal: '3433334444', cep: '38744538' }),
  contato({ id: 'e' }),
]
const totais = contarProblemas(amostra)
const campoDe = { telefone: 'telefoneRuim', 'telefone-divergente': 'telefoneDivergente', cep: 'cepIncompleto' } as const
for (const f of FILTROS_RESPONSAVEL) {
  const naLista = amostra.filter(c => casaComFiltro(diagnosticarContato(c), f)).length
  assert.equal(naLista, totais[campoDe[f]], `filtro ${f}: lista e painel contam igual`)
}
assert.deepEqual(amostra.filter(c => casaComFiltro(diagnosticarContato(c), 'telefone')).map(c => c.id), ['a', 'c'])
assert.deepEqual(amostra.filter(c => casaComFiltro(diagnosticarContato(c), 'telefone-divergente')).map(c => c.id), ['a', 'b'])
assert.deepEqual(amostra.filter(c => casaComFiltro(diagnosticarContato(c), 'cep')).map(c => c.id), ['c'])
assert.equal(lerFiltroResponsavel('telefone'), 'telefone')
assert.equal(lerFiltroResponsavel('cep'), 'cep')
assert.equal(lerFiltroResponsavel('qualquer-coisa'), null, 'valor desconhecido na URL é ignorado')
assert.equal(lerFiltroResponsavel(undefined), null)
assert.equal(lerFiltroResponsavel(['telefone', 'cep']), null, 'parâmetro repetido na URL também')

// ── motivos (para a lista de responsáveis) ──
const motivos = diagnosticarContato(contato({ telefone_perfil: '3488126967', telefone_principal: '34998822549', cep: '38742-24' })).motivos
assert.equal(motivos.length, 3)
assert.ok(motivos.some(m => /nono/i.test(m)), 'diz que falta o nono dígito')
assert.ok(motivos.some(m => /diferent/i.test(m)), 'diz que os dois cadastros diferem')
assert.ok(motivos.some(m => /CEP/.test(m)))

// ── pacientes ativos sem responsável ──
assert.deepEqual(
  pacientesAtivosSemResponsavel(
    [{ id: 'p1', status: 'ativo' }, { id: 'p2', status: 'ativo' }, { id: 'p3', status: 'alta' }, { id: 'p4', status: 'desativado' }],
    [{ paciente_id: 'p1' }, { paciente_id: 'p1' }],
  ),
  ['p2'],
  'só ativos; alta e desativado sem responsável não contam; vários vínculos do mesmo paciente não atrapalham',
)
assert.deepEqual(pacientesAtivosSemResponsavel([], []), [])

// ── linhas do painel: só as que têm contagem; tudo limpo = painel some ──
assert.deepEqual(linhasDoPainel({ responsaveis: 105, telefoneRuim: 0, telefoneDivergente: 0, cepIncompleto: 0 }, 0), [])
const tudo = linhasDoPainel({ responsaveis: 105, telefoneRuim: 19, telefoneDivergente: 6, cepIncompleto: 1 }, 14)
assert.deepEqual(tudo.map(l => [l.chave, l.contagem]), [
  ['telefone', 19], ['telefone-divergente', 6], ['cep', 1], ['sem-responsavel', 14],
])
assert.deepEqual(tudo.map(l => l.href), [
  '/admin/responsaveis?problema=telefone',
  '/admin/responsaveis?problema=telefone-divergente',
  '/admin/responsaveis?problema=cep',
  '/admin/pacientes?sem_responsavel=1',
])
const soCep = linhasDoPainel({ responsaveis: 105, telefoneRuim: 0, telefoneDivergente: 0, cepIncompleto: 1 }, 0)
assert.deepEqual(soCep.map(l => l.chave), ['cep'], 'linha com contagem zero não aparece')
assert.equal(linhasDoPainel({ responsaveis: 105, telefoneRuim: 3, telefoneDivergente: 0, cepIncompleto: 0 }, 0)[0].chave, 'telefone')
assert.deepEqual(linhasDoPainel({ responsaveis: 0, telefoneRuim: 0, telefoneDivergente: 0, cepIncompleto: 0 }, null), [], 'sem permissão para ver pacientes: a linha não existe')

// texto: diz o que fazer, no singular e no plural, sem sugerir correção automática
assert.match(tudo[0].texto, /^19 responsáveis com telefone/)
assert.match(tudo[0].texto, /confirmar o número com a família/)
assert.match(tudo[1].texto, /^6 responsáveis/)
assert.match(tudo[2].texto, /^1 responsável com CEP/)
assert.match(tudo[3].texto, /^14 pacientes ativos sem responsável/)
assert.match(linhasDoPainel({ responsaveis: 1, telefoneRuim: 1, telefoneDivergente: 0, cepIncompleto: 0 }, null)[0].texto, /^1 responsável com telefone que não completa chamada/)
assert.match(linhasDoPainel({ responsaveis: 1, telefoneRuim: 0, telefoneDivergente: 0, cepIncompleto: 0 }, 1)[0].texto, /^1 paciente ativo sem responsável/)
for (const l of tudo) {
  assert.doesNotMatch(l.texto, /autom[aá]tic|corrigi(r|da|do)\b|prefix/i, 'nunca sugere corrigir sozinho')
  // a home da recepção fica numa mesa de atendimento: contagem e link, nunca número de telefone
  assert.equal(/\d{4,}/.test(l.texto), false, 'o texto não carrega número de telefone')
}

// ── fonte única: a regra de telefone mora em lib/telefone.ts, sem segunda cópia aqui ──
const fonte = readFileSync('lib/qualidade-dados/responsaveis.ts', 'utf8')
assert.match(fonte, /classificarTelefone/, 'usa o classificador compartilhado')
assert.match(fonte, /validarCep/, 'e o validador de CEP compartilhado')
assert.doesNotMatch(fonte, /length\s*(===|!==|<|>)\s*1[01]\b/, 'sem regra de tamanho de telefone própria')
assert.doesNotMatch(fonte, /\[2-5\]|'2'|"2"/, 'sem regra do primeiro dígito do fixo própria')

console.log('Qualidade de dados: testes passaram')
