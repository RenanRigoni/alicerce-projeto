import assert from 'node:assert/strict'
import { formatarCep, formatarEndereco, type EnderecoResponsavel } from '../lib/endereco/formatar'
import { mapearResponsaveisVinculo } from '../lib/paciente/responsaveis-vinculo'

const vazio: EnderecoResponsavel = {
  endereco: null, numero: null, complemento: null, bairro: null, cidade: null, estado: null, cep: null,
}

// endereço completo
assert.equal(
  formatarEndereco({
    endereco: 'Rua das Flores', numero: '123', complemento: 'Apto 4', bairro: 'Centro',
    cidade: 'Uberlândia', estado: 'MG', cep: '38400000',
  }),
  'Rua das Flores, 123, Apto 4 - Centro - Uberlândia/MG - CEP 38400-000',
)

// sem complemento, sem número, sem estado: não sobram vírgulas nem hífens soltos
assert.equal(formatarEndereco({ ...vazio, endereco: 'Av. Brasil', cidade: 'Uberlândia' }), 'Av. Brasil - Uberlândia')
assert.equal(formatarEndereco({ ...vazio, endereco: 'Av. Brasil', numero: 's/n' }), 'Av. Brasil, s/n')
assert.equal(formatarEndereco({ ...vazio, cidade: 'Uberlândia', estado: 'MG' }), 'Uberlândia/MG')

// nada preenchido (37+ responsáveis no banco): null, não string vazia nem "undefined"
assert.equal(formatarEndereco(vazio), null)
assert.equal(formatarEndereco({ ...vazio, endereco: '   ', cidade: '' }), null)

// CEP: os três formatos que existem no banco
assert.equal(formatarCep('38400000'), '38400-000')
assert.equal(formatarCep('38400-000'), '38400-000')
assert.equal(formatarCep('38400-00'), '38400-00') // incompleto: mantém como está
assert.equal(formatarCep(null), '')

// mapeador: junção 1-para-1 pode vir como objeto ou array, e responsável sem linha em detalhes
const mapeados = mapearResponsaveisVinculo([
  { tipo: 'secundario', profiles: { id: '2', nome: 'Pai', responsaveis_detalhes: null } },
  { tipo: 'principal', profiles: { id: '1', nome: 'Mãe', responsaveis_detalhes: { endereco: 'Rua A', numero: '1', cidade: 'X', estado: 'MG', telefone_principal: '3499' } } },
  { tipo: 'principal', profiles: { id: '3', nome: 'Avó', responsaveis_detalhes: [{ endereco: 'Rua B', bairro: 'Y' }] } },
  { tipo: 'principal', profiles: null }, // RLS escondeu o perfil
])
assert.deepEqual(mapeados.map(r => r.id), ['2', '1', '3'])
assert.equal(mapeados[0].endereco, null)
assert.equal(mapeados[0].telefone_principal, null)
assert.equal(mapeados[1].numero, '1')
assert.equal(mapeados[2].endereco, 'Rua B')
assert.equal(mapeados[2].bairro, 'Y')
assert.deepEqual(mapearResponsaveisVinculo(null), [])

console.log('Endereco: testes passaram')
