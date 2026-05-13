import assert from 'node:assert/strict'
import {
  calcularOverrides,
  temPermissao,
  todasPermissoes,
} from '../lib/permissoes/definicoes'

const alexandra = {
  cadastrar_pacientes: true,
  editar_pacientes: true,
  desativar_reativar_paciente: true,
  gerenciar_responsaveis: true,
}

assert.equal(temPermissao('terapeuta', {}, 'cadastrar_pacientes'), false)
assert.equal(temPermissao('terapeuta', {}, 'registrar_alta'), true)

assert.equal(temPermissao('terapeuta', alexandra, 'cadastrar_pacientes'), true)
assert.equal(temPermissao('terapeuta', alexandra, 'editar_pacientes'), true)
assert.equal(temPermissao('terapeuta', alexandra, 'desativar_reativar_paciente'), true)
assert.equal(temPermissao('terapeuta', alexandra, 'gerenciar_responsaveis'), true)
assert.equal(temPermissao('terapeuta', alexandra, 'vincular_terapeutas'), false)

const efetivasAlexandra = todasPermissoes('terapeuta', alexandra)
assert.equal(efetivasAlexandra.cadastrar_pacientes, true)
assert.equal(efetivasAlexandra.registrar_alta, true)
assert.equal(efetivasAlexandra.ver_todos_pacientes, false)

const estadoTerapeuta = todasPermissoes('terapeuta', {})
estadoTerapeuta.cadastrar_pacientes = true
estadoTerapeuta.registrar_alta = false
const overridesTerapeuta = calcularOverrides('terapeuta', estadoTerapeuta)
assert.deepEqual(overridesTerapeuta, {
  cadastrar_pacientes: true,
  registrar_alta: false,
})

assert.equal(temPermissao('admin', {}, 'cadastrar_pacientes'), true)
assert.equal(temPermissao('admin', { cadastrar_pacientes: false }, 'cadastrar_pacientes'), false)

console.log('Permissoes: testes passaram')
