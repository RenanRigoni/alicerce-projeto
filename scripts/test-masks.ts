import assert from 'node:assert/strict'
import { mascaraCpf, mascaraCpfCnpj } from '../lib/masks'

// Telefone saiu daqui: ver lib/telefone.ts e scripts/test-telefone.ts.

assert.equal(mascaraCpf(''), '')
assert.equal(mascaraCpf('123'), '123')
assert.equal(mascaraCpf('1234'), '123.4')
assert.equal(mascaraCpf('12345678901'), '123.456.789-01')
assert.equal(mascaraCpf('123456789012345'), '123.456.789-01', 'passou do limite: corta')

assert.equal(mascaraCpfCnpj('12345678901'), '123.456.789-01')
assert.equal(mascaraCpfCnpj('12345678000195'), '12.345.678/0001-95')

console.log('Máscaras: testes passaram')
