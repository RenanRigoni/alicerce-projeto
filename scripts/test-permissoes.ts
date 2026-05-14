import assert from 'node:assert/strict'
import {
  calcularOverrides,
  gruposPorRole,
  permissaoAplicavel,
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
assert.equal(temPermissao('terapeuta', { ver_auditoria: true }, 'ver_auditoria'), false)
assert.equal(temPermissao('terapeuta', { criar_agendamentos: true }, 'criar_agendamentos'), false)

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

const estadoTerapeutaComChaveInaplicavel = todasPermissoes('terapeuta', {})
estadoTerapeutaComChaveInaplicavel.ver_auditoria = true
assert.deepEqual(calcularOverrides('terapeuta', estadoTerapeutaComChaveInaplicavel), {})

const permissoesTerapeuta = gruposPorRole('terapeuta').flatMap(grupo => grupo.permissoes)
assert.equal(permissoesTerapeuta.includes('cadastrar_pacientes'), true)
assert.equal(permissoesTerapeuta.includes('registrar_alta'), true)
assert.equal(permissoesTerapeuta.includes('ver_auditoria'), false)
assert.equal(permissoesTerapeuta.includes('criar_agendamentos'), false)
assert.equal(permissoesTerapeuta.includes('editar_agendamentos_alheios'), false)
assert.equal(permissoesTerapeuta.includes('bloquear_acesso_portal'), false)

const permissoesFamilia = gruposPorRole('pai').flatMap(grupo => grupo.permissoes)
assert.deepEqual(permissoesFamilia, ['bloquear_acesso_portal'])
assert.equal(permissaoAplicavel('pai', 'bloquear_acesso_portal'), true)
assert.equal(permissaoAplicavel('pai', 'cadastrar_pacientes'), false)

assert.equal(temPermissao('admin', {}, 'cadastrar_pacientes'), true)
assert.equal(temPermissao('admin', { cadastrar_pacientes: false }, 'cadastrar_pacientes'), true)
assert.deepEqual(calcularOverrides('admin', { ...todasPermissoes('admin', {}), cadastrar_pacientes: false }), {})

console.log('Permissoes: testes passaram')
