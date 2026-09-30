import assert from 'node:assert/strict'
import {
  filtrarPacientes,
  lerModoSalvo,
  normalizarBusca,
  salvarModo,
  type PacienteDaLista,
  type StatusPaciente,
} from '../lib/pacientes/filtrar-lista'

const p = (id: string, nome: string, codigo: string | null, status: StatusPaciente = 'ativo'): PacienteDaLista => ({
  id, nome, codigo_interno: codigo, status, frequencia_atendimento: null,
})

const pacientes = [
  p('a', 'João Pedro Eugênio', '155'),
  p('b', 'Maria Clara', '101'),
  p('c', 'Pedro Henrique', '215'),
  p('d', 'Ana Beatriz', '155', 'alta'),
  p('e', 'Sem Codigo', null),
]
const meus = new Set(['a', 'b'])
const ativos = new Set<StatusPaciente>(['ativo'])
const base = { pacientes, meusIds: meus, status: ativos, busca: '' }
const ids = (lista: PacienteDaLista[]) => lista.map(x => x.id)

// alternador: "meus" só mostra os vinculados, "todos" mostra todos os ativos
assert.deepEqual(ids(filtrarPacientes({ ...base, modo: 'meus' })), ['a', 'b'])
assert.deepEqual(ids(filtrarPacientes({ ...base, modo: 'todos' })), ['a', 'b', 'c', 'e'])

// busca por código, com e sem "#"
assert.deepEqual(ids(filtrarPacientes({ ...base, modo: 'todos', busca: '#155' })), ['a'])
assert.deepEqual(ids(filtrarPacientes({ ...base, modo: 'todos', busca: '155' })), ['a'])
assert.equal(normalizarBusca('  #155 '), '155')

// busca por nome, sem depender de acento nem de caixa
assert.deepEqual(ids(filtrarPacientes({ ...base, modo: 'todos', busca: 'joao pedro' })), ['a'])
assert.deepEqual(ids(filtrarPacientes({ ...base, modo: 'todos', busca: 'EUGÊNIO' })), ['a'])
assert.deepEqual(ids(filtrarPacientes({ ...base, modo: 'todos', busca: 'pedro' })), ['a', 'c'])

// a busca respeita o modo: no "meus", quem não é dela não aparece nem achado por nome
assert.deepEqual(ids(filtrarPacientes({ ...base, modo: 'meus', busca: 'pedro' })), ['a'])

// "#" sozinho não filtra nada; o filtro de status continua valendo
assert.equal(filtrarPacientes({ ...base, modo: 'todos', busca: '#' }).length, 4)
assert.deepEqual(ids(filtrarPacientes({ ...base, modo: 'todos', status: new Set<StatusPaciente>(['alta']), busca: '155' })), ['d'])

// sessionStorage que lança (navegação privativa) não pode quebrar leitura nem escrita
const armazenamentoQuebrado = {
  getItem() { throw new Error('SecurityError') },
  setItem() { throw new Error('QuotaExceededError') },
}
;(globalThis as { window?: unknown }).window = { sessionStorage: armazenamentoQuebrado }
assert.equal(lerModoSalvo('k'), null)
assert.doesNotThrow(() => salvarModo('k', 'todos'))

// valor salvo inválido é ignorado
;(globalThis as { window?: unknown }).window = { sessionStorage: { getItem: () => 'qualquer', setItem() {} } }
assert.equal(lerModoSalvo('k'), null)
;(globalThis as { window?: unknown }).window = { sessionStorage: { getItem: () => 'todos', setItem() {} } }
assert.equal(lerModoSalvo('k'), 'todos')

console.log('Filtro de pacientes: testes passaram')
