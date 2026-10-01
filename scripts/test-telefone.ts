import assert from 'node:assert/strict'
import {
  aplicarNumeroDigitado,
  classificarTelefone,
  distribuirTelefoneColado,
  formatarTelefone,
  juntarTelefone,
  mascaraNumeroTelefone,
  posicaoDoCursor,
  separarTelefone,
  somenteDigitosTelefone,
  validarTelefone,
  validarTelefoneDoContatoEmergencia,
} from '../lib/telefone'

// ── máscara do número: ancorada à direita, sufixo = sempre os 4 últimos dígitos ──
const TABELA: Array<[string, string]> = [
  ['', ''],
  ['1', '1'],
  ['12', '12'],
  ['123', '123'],
  ['1234', '1234'],
  ['12345', '1-2345'],
  ['123456', '12-3456'],
  ['1234567', '123-4567'],
  ['12345678', '1234-5678'], // fixo completo
  ['123456789', '12345-6789'], // celular completo
]
for (const [digitos, mostra] of TABELA) {
  assert.equal(mascaraNumeroTelefone(digitos), mostra, `${digitos.length} dígitos`)
}

// o hífen nunca salta: a cada dígito novo, o sufixo continua sendo os 4 últimos
for (let n = 5; n <= 9; n++) {
  const m = mascaraNumeroTelefone('987654321'.slice(0, n))
  assert.equal(m.split('-')[1].length, 4, `${n} dígitos: sufixo de 4`)
  assert.equal(m.split('-')[0].length, n - 4, `${n} dígitos: prefixo cresce`)
}
// nunca hífen solto no fim, nem no começo
for (let n = 0; n <= 9; n++) {
  const m = mascaraNumeroTelefone('987654321'.slice(0, n))
  assert.ok(!m.endsWith('-') && !m.startsWith('-'), `${n} dígitos: sem hífen solto`)
}
// idempotente: reaplicar sobre o que ela mesma produziu não muda nada
for (let n = 0; n <= 9; n++) {
  const m = mascaraNumeroTelefone('987654321'.slice(0, n))
  assert.equal(mascaraNumeroTelefone(m), m, `${n} dígitos: idempotente`)
}
assert.equal(mascaraNumeroTelefone('12-3456'), '12-3456')
assert.equal(mascaraNumeroTelefone('abc'), '')
// valor legado com mais de 9 dígitos é exibido inteiro, não truncado
assert.equal(mascaraNumeroTelefone('9988649617'), '998864-9617')

// ── separar / juntar: o armazenamento continua uma string de dígitos ──
assert.deepEqual(separarTelefone('34998822549'), { ddd: '34', numero: '998822549' })
assert.deepEqual(separarTelefone('3433334444'), { ddd: '34', numero: '33334444' })
assert.deepEqual(separarTelefone('998822549'), { ddd: '', numero: '998822549' }, '9 dígitos = sem DDD')
assert.deepEqual(separarTelefone('33334444'), { ddd: '', numero: '33334444' }, '8 dígitos = sem DDD')
assert.deepEqual(separarTelefone('(34) 99882-2549'), { ddd: '34', numero: '998822549' }, 'aceita máscara antiga')
assert.deepEqual(separarTelefone(''), { ddd: '', numero: '' })
assert.deepEqual(separarTelefone('349988649617'), { ddd: '34', numero: '9988649617' }, 'legado de 12 dígitos não é truncado')

assert.equal(juntarTelefone('34', '998822549'), '34998822549')
assert.equal(juntarTelefone('', '33334444'), '33334444')
assert.equal(juntarTelefone('34', ''), '34')
assert.equal(juntarTelefone('', ''), '')
// DDD pela metade invalida o conjunto em vez de colar o dígito no número e parecer um telefone sem DDD
assert.equal(juntarTelefone('3', '99882254'), '3')
assert.equal(classificarTelefone(juntarTelefone('3', '99882254')), 'tamanho_invalido')

// ── colar: distribui nos dois campos, não trunca ──
assert.deepEqual(distribuirTelefoneColado('(34) 99882-2549'), { ddd: '34', numero: '998822549' })
assert.deepEqual(distribuirTelefoneColado('34998822549'), { ddd: '34', numero: '998822549' })
assert.deepEqual(distribuirTelefoneColado('34 3333-4444'), { ddd: '34', numero: '33334444' })
assert.deepEqual(distribuirTelefoneColado('+55 (34) 99882-2549'), { ddd: '34', numero: '998822549' }, '+55 do WhatsApp')
assert.deepEqual(distribuirTelefoneColado('5534998822549'), { ddd: '34', numero: '998822549' })
assert.deepEqual(distribuirTelefoneColado('034 99882-2549'), { ddd: '34', numero: '998822549' }, 'zero de operadora')
assert.deepEqual(distribuirTelefoneColado('99882-2549'), { ddd: '', numero: '998822549' }, 'só o número: DDD fica como está')
assert.deepEqual(distribuirTelefoneColado('3333-4444'), { ddd: '', numero: '33334444' })
assert.deepEqual(distribuirTelefoneColado('349988225491234'), { ddd: '34', numero: '998822549' }, 'passou do limite: corta no fim')
assert.deepEqual(distribuirTelefoneColado('abc'), { ddd: '', numero: '' })

// ── digitar no campo do número ──
assert.deepEqual(aplicarNumeroDigitado('34', '99882'), { ddd: '34', numero: '99882' })
assert.deepEqual(aplicarNumeroDigitado('34', '9988225499'), { ddd: '34', numero: '998822549' }, 'com DDD, o 10º dígito não entra')
assert.deepEqual(
  aplicarNumeroDigitado('', '3499882254'),
  { ddd: '34', numero: '99882254' },
  'quem digita DDD+número direto no campo do número tem o DDD separado ao chegar no 10º dígito',
)
assert.deepEqual(aplicarNumeroDigitado('', '99882254'), { ddd: '', numero: '99882254' })

// ── posição do cursor depois de remascarar ──
assert.equal(posicaoDoCursor('12-3456', 0), 0)
assert.equal(posicaoDoCursor('12-3456', 2), 2)
assert.equal(posicaoDoCursor('12-3456', 3), 4, 'depois do 3º dígito, já passou o hífen')
assert.equal(posicaoDoCursor('12-3456', 6), 7)
assert.equal(posicaoDoCursor('1-2345', 1), 1)
assert.equal(posicaoDoCursor('1234', 99), 4)

// ── exibição: telefone completo, só leitura ──
assert.equal(formatarTelefone('34998822549'), '(34) 99882-2549')
assert.equal(formatarTelefone('3433334444'), '(34) 3333-4444')
assert.equal(formatarTelefone('33334444'), '3333-4444')
assert.equal(formatarTelefone('998822549'), '99882-2549')
assert.equal(formatarTelefone('(34) 99882-2549'), '(34) 99882-2549')
assert.equal(formatarTelefone(''), '')
assert.equal(formatarTelefone('349988649617'), '349988649617', '12 dígitos: mostra como está, não inventa formato')
assert.equal(formatarTelefone('123'), '123', 'incompleto: como está')

// ── dígitos para gravar ──
assert.equal(somenteDigitosTelefone('(34) 3333-4444'), '3433334444')
assert.equal(somenteDigitosTelefone(' 34 998864 9617 '), '349988649617', 'não corta em 11: o validador é quem recusa')
assert.equal(somenteDigitosTelefone(''), '')
assert.equal(somenteDigitosTelefone(null), '')
assert.equal(somenteDigitosTelefone(34998822549), '34998822549')

// ── classificação (fonte única: tela, servidor e painel) — um caso de cada categoria ──
assert.equal(classificarTelefone(''), 'vazio')
assert.equal(classificarTelefone('   '), 'vazio')
assert.equal(classificarTelefone(null), 'vazio')
assert.equal(classificarTelefone(undefined), 'vazio')
assert.equal(classificarTelefone('34998822549'), 'celular', '11 dígitos, 3º = 9')
assert.equal(classificarTelefone('(34) 99882-2549'), 'celular', 'com máscara')
assert.equal(classificarTelefone('3433334444'), 'fixo', '10 dígitos, número começa com 3')
for (const inicio of ['2', '3', '4', '5']) {
  assert.equal(classificarTelefone(`34${inicio}3334444`), 'fixo', `fixo começando com ${inicio}`)
}
assert.equal(classificarTelefone('3488126967'), 'celular_sem_nono_digito', '10 dígitos, número começa com 8')
assert.equal(classificarTelefone('3491599591'), 'celular_sem_nono_digito', '10 dígitos, número começa com 9')
assert.equal(classificarTelefone('(34) 9159-9591'), 'celular_sem_nono_digito')
assert.equal(classificarTelefone('34388126967'), 'suspeito', '11 dígitos, 3º ≠ 9')
assert.equal(classificarTelefone('3463334444'), 'suspeito', '10 dígitos começando com 6 não é fixo nem celular')
assert.equal(classificarTelefone('3473334444'), 'suspeito')
for (const lixo of ['3', '34', '349988', '33334444', '998822549', '349988649617', '5534998822549', 'abc']) {
  assert.equal(classificarTelefone(lixo), 'tamanho_invalido', `tamanho inválido: ${lixo}`)
}
// fixo válido NÃO é erro (a clínica é 100% celular, mas o telefone do médico pode ser de consultório)
assert.equal(validarTelefone('3433334444').valido, true)
assert.equal(validarTelefone('3433334444').aviso, null)

// os 3 valores reais de 12 dígitos de profiles.telefone
for (const real of ['34 998864 9617', '(34) 993222-2908', '(34) 9990304406']) {
  assert.equal(classificarTelefone(real), 'tamanho_invalido', real)
}

// ── validarTelefone: o que a tela e as rotas usam ──
const vazio = validarTelefone('')
assert.deepEqual(vazio, { valido: true, telefone: null, classe: 'vazio', aviso: null })
assert.equal(validarTelefone(null).valido, true)

const cel = validarTelefone('(34) 99882-2549')
assert.deepEqual(cel, { valido: true, telefone: '34998822549', classe: 'celular', aviso: null })

// celular sem o nono dígito e suspeito: salvam, com aviso (telefone de família: quem confirma é a recepção)
const semNono = validarTelefone('3488126967')
assert.equal(semNono.valido, true)
assert.equal(semNono.telefone, '3488126967', 'NÃO prefixa o 9 sozinho')
assert.equal(semNono.classe, 'celular_sem_nono_digito')
assert.match(semNono.aviso ?? '', /nono/i)
const suspeito = validarTelefone('34388126967')
assert.equal(suspeito.valido, true)
assert.equal(suspeito.telefone, '34388126967')
assert.ok(suspeito.aviso)

// tamanho inválido barra, com mensagem que diz quantos faltam/sobram
const curto = validarTelefone('349988')
assert.equal(curto.valido, false)
assert.match(curto.mensagem ?? '', /incompleto/i)
const longo = validarTelefone('349988649617')
assert.equal(longo.valido, false)
assert.match(longo.mensagem ?? '', /a mais/i)
assert.equal(validarTelefone('abc').valido, false)

// sem DDD só vale onde a opção é ligada (telefone do médico: recepção é local e disca sem DDD)
assert.equal(validarTelefone('33334444').valido, false)
assert.equal(validarTelefone('998822549').valido, false)
for (const t of ['33334444', '998822549', '3433334444', '34998822549']) {
  const r = validarTelefone(t, { aceitaSemDdd: true })
  assert.equal(r.valido, true, `médico aceita ${t.length} dígitos`)
  assert.equal(r.telefone, t)
}
assert.equal(classificarTelefone('33334444', { aceitaSemDdd: true }), 'sem_ddd')
assert.equal(classificarTelefone('998822549', { aceitaSemDdd: true }), 'sem_ddd')
for (const t of ['3', '3333444', '349988649', '349988649617']) {
  assert.equal(validarTelefone(t, { aceitaSemDdd: true }).valido, t.length >= 8 && t.length <= 11, `médico, ${t.length} dígitos`)
}
assert.equal(validarTelefone('3433334', { aceitaSemDdd: true }).valido, false, '7 dígitos: tamanho intermediário inválido')

// ── contato de emergência: "Nome — telefone" ──
assert.equal(validarTelefoneDoContatoEmergencia('Ana — (34) 99999-9999').valido, true)
assert.equal(validarTelefoneDoContatoEmergencia('Ana — (34) 99999-9999').telefone, '34999999999')
assert.equal(validarTelefoneDoContatoEmergencia('Ana — 123').valido, false)
assert.equal(validarTelefoneDoContatoEmergencia('Ana — (34) 993222-2908').valido, false, '12 dígitos')
assert.equal(validarTelefoneDoContatoEmergencia('Só o nome').valido, true, 'sem separador: nada a validar')
assert.equal(validarTelefoneDoContatoEmergencia('Ana — ').valido, true, 'separador sem telefone')
assert.equal(validarTelefoneDoContatoEmergencia(null).valido, true)
assert.equal(validarTelefoneDoContatoEmergencia(42).valido, true)

console.log('Telefone: testes passaram')
