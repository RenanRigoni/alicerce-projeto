import assert from 'node:assert/strict'
import { mascaraTelefone, somenteDigitosTelefone } from '../lib/masks'

// A cópia que existia em 4 telas. Serve de referência: o que não é fixo de 10 dígitos
// tem de continuar igual.
function mascaraTelefoneAntiga(valor: string) {
  const d = valor.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 2) return d.length ? `(${d}` : ''
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

// ── celular (11 dígitos) e vazio: idêntico ao que as telas faziam ──
assert.equal(mascaraTelefone(''), '')
assert.equal(mascaraTelefone('3'), '(3')
assert.equal(mascaraTelefone('34'), '(34')
assert.equal(mascaraTelefone('349'), '(34) 9')
assert.equal(mascaraTelefone('34991234567'), '(34) 99123-4567')
for (let n = 0; n <= 6; n++) {
  const digitos = '34991234567'.slice(0, n)
  assert.equal(mascaraTelefone(digitos), mascaraTelefoneAntiga(digitos), `${n} dígitos: sem mudança`)
}
assert.equal(mascaraTelefone('34991234567'), mascaraTelefoneAntiga('34991234567'), '11 dígitos: sem mudança')

// ── fixo (10 dígitos): era "(34) 33334-444", agora "(34) 3333-4444" ──
assert.equal(mascaraTelefoneAntiga('3433334444'), '(34) 33334-444', 'documenta o defeito antigo')
assert.equal(mascaraTelefone('3433334444'), '(34) 3333-4444')
assert.equal(mascaraTelefone('34333'), '(34) 333')
assert.equal(mascaraTelefone('343333'), '(34) 3333')
assert.equal(mascaraTelefone('3433334'), '(34) 3333-4')
assert.equal(mascaraTelefone('34333344'), '(34) 3333-44')

// ── colar formatado, com lixo, ou passar do limite ──
assert.equal(mascaraTelefone('(34) 99123-4567'), '(34) 99123-4567')
assert.equal(mascaraTelefone('(34) 3333-4444'), '(34) 3333-4444')
assert.equal(mascaraTelefone('+55 (34) 99123-4567'), '(55) 34991-2345', 'só os 11 primeiros dígitos; quem cola com +55 vê e corrige')
assert.equal(mascaraTelefone('349912345678999'), '(34) 99123-4567')
assert.equal(mascaraTelefone('abc'), '')

// ── a máscara é idempotente: reaplicar sobre o que ela mesma produziu não muda nada ──
for (let n = 0; n <= 11; n++) {
  const m = mascaraTelefone('34991234567'.slice(0, n))
  assert.equal(mascaraTelefone(m), m, `${n} dígitos: idempotente`)
}

// ── dígitos para gravar ──
assert.equal(somenteDigitosTelefone('(34) 3333-4444'), '3433334444')
assert.equal(somenteDigitosTelefone('(34) 99123-4567'), '34991234567')
assert.equal(somenteDigitosTelefone(''), '')

console.log('Máscaras: testes passaram')
