import assert from 'node:assert/strict'
import {
  ERRO_AO_MENOS_UM, FORM_VAZIO, LIMITES, UFS,
  encaminhamentoTemConteudo, escaparLike, formDoEncaminhamento, formatarCrm, mascaraCrm,
  prepararEncaminhamentoDoCadastro, sugestoesDeMedicos, validarEncaminhamento,
  type Encaminhamento, type FormEncaminhamento,
} from '../lib/paciente/encaminhamentos'

const form = (parcial: Partial<FormEncaminhamento>): FormEncaminhamento => ({ ...FORM_VAZIO, ...parcial })

function dadosValidos(parcial: Partial<FormEncaminhamento>) {
  const r = validarEncaminhamento(form(parcial))
  assert.equal(r.valido, true, `esperava válido para ${JSON.stringify(parcial)}`)
  return r.valido ? r.dados : (undefined as never)
}
function erroDe(parcial: Partial<FormEncaminhamento>) {
  const r = validarEncaminhamento(form(parcial))
  assert.equal(r.valido, false, `esperava erro para ${JSON.stringify(parcial)}`)
  return r.valido ? '' : r.erro
}

// ── nenhum dos três (nome, CRM, telefone) é obrigatório sozinho; é preciso ao menos um ──
assert.equal(erroDe({}), ERRO_AO_MENOS_UM, 'os três vazios: recusado na tela')
assert.match(ERRO_AO_MENOS_UM, /ao menos um/)
assert.equal(erroDe({ medico_nome: '   ', medico_crm: '  ', medico_telefone: ' ' }), ERRO_AO_MENOS_UM)
assert.deepEqual(dadosValidos({ medico_nome: '  Dra. Ana  ' }), {
  medico_nome: 'Dra. Ana', medico_crm: null, medico_crm_uf: null, medico_telefone: null, especialidade: null,
  data_encaminhamento: null, motivo: null, observacoes: null,
}, 'só o nome')
assert.deepEqual(dadosValidos({ medico_crm: '12345' }), {
  medico_nome: null, medico_crm: '12345', medico_crm_uf: null, medico_telefone: null, especialidade: null,
  data_encaminhamento: null, motivo: null, observacoes: null,
}, 'só o CRM: o nome vai como null, não como texto vazio')
assert.deepEqual(dadosValidos({ medico_telefone: '(34) 99123-4567' }), {
  medico_nome: null, medico_crm: null, medico_crm_uf: null, medico_telefone: '34991234567', especialidade: null,
  data_encaminhamento: null, motivo: null, observacoes: null,
}, 'só o telefone, guardado sem máscara')
assert.equal(erroDe({ medico_crm_uf: 'MG' }), ERRO_AO_MENOS_UM, 'UF sozinha não conta')
assert.equal(
  erroDe({ especialidade: 'Neuro', motivo: 'atraso', data_encaminhamento: '2026-09-20' }),
  ERRO_AO_MENOS_UM, 'os outros campos sozinhos não contam',
)

// ── telefone: opcional, 10 (fixo) ou 11 (celular) dígitos, guardado só com dígitos ──
assert.equal(dadosValidos({ medico_telefone: '(34) 3333-4444' }).medico_telefone, '3433334444')
assert.equal(dadosValidos({ medico_nome: 'A', medico_telefone: '34991234567' }).medico_telefone, '34991234567')
assert.equal(dadosValidos({ medico_nome: 'A', medico_telefone: '' }).medico_telefone, null)
assert.equal(dadosValidos({ medico_nome: 'A', medico_telefone: '   ' }).medico_telefone, null)
const ERRO_TELEFONE = 'Telefone do médico deve ter DDD e número (10 ou 11 dígitos).'
assert.equal(erroDe({ medico_nome: 'A', medico_telefone: '123' }), ERRO_TELEFONE)
assert.equal(erroDe({ medico_nome: 'A', medico_telefone: '349912345' }), ERRO_TELEFONE, '9 dígitos')
assert.equal(erroDe({ medico_nome: 'A', medico_telefone: '3499123456789' }), ERRO_TELEFONE, '13 dígitos colados não são truncados para 11')
assert.equal(erroDe({ medico_nome: 'A', medico_telefone: 'abc' }), ERRO_TELEFONE, 'só letras: nenhum dígito')
assert.equal(erroDe({ medico_telefone: '123' }), ERRO_TELEFONE, 'telefone inválido sozinho dá o erro do telefone, não o de "ao menos um"')

// ── CRM: opcional, só números; o que vier formatado é limpo ──
assert.equal(dadosValidos({ medico_nome: 'A', medico_crm: '12345' }).medico_crm, '12345')
assert.equal(dadosValidos({ medico_nome: 'A', medico_crm: 'CRM 12.345' }).medico_crm, '12345')
assert.equal(dadosValidos({ medico_nome: 'A', medico_crm: '' }).medico_crm, null)
assert.equal(erroDe({ medico_nome: 'A', medico_crm: 'abc' }), 'CRM deve ter apenas números.')
assert.equal(erroDe({ medico_crm: 'abc' }), 'CRM deve ter apenas números.', 'CRM inválido sozinho: erro do CRM')
assert.equal(mascaraCrm('12345678901234'), '1234567890', 'limite de 10 dígitos')
assert.equal(mascaraCrm('12/MG'), '12')

// ── UF: maiúscula, das 27; pode faltar mesmo com CRM ──
assert.equal(dadosValidos({ medico_nome: 'A', medico_crm: '1', medico_crm_uf: 'mg' }).medico_crm_uf, 'MG')
assert.equal(dadosValidos({ medico_nome: 'A', medico_crm: '1', medico_crm_uf: '' }).medico_crm_uf, null)
assert.equal(erroDe({ medico_nome: 'A', medico_crm_uf: 'XX' }), 'UF do CRM inválida.')
assert.equal(UFS.length, 27)
assert.equal(new Set(UFS).size, 27)

// ── data ──
assert.equal(dadosValidos({ medico_nome: 'A', data_encaminhamento: '2026-09-20' }).data_encaminhamento, '2026-09-20')
assert.equal(erroDe({ medico_nome: 'A', data_encaminhamento: '2026-02-30' }), 'Data do encaminhamento inválida.')
assert.equal(erroDe({ medico_nome: 'A', data_encaminhamento: '20/09/2026' }), 'Data do encaminhamento inválida.')
assert.equal(erroDe({ medico_nome: 'A', data_encaminhamento: '0001-01-01' }), 'Data do encaminhamento inválida.')
assert.equal(dadosValidos({ medico_nome: 'A', data_encaminhamento: '2024-02-29' }).data_encaminhamento, '2024-02-29', 'ano bissexto')

// ── limites e texto vazio ──
assert.match(erroDe({ medico_nome: 'x'.repeat(LIMITES.medico_nome + 1) }), /Nome do médico passa de 200/)
assert.match(erroDe({ medico_nome: 'A', motivo: 'x'.repeat(LIMITES.motivo + 1) }), /Motivo passa de 2000/)
assert.equal(dadosValidos({ medico_nome: 'A', motivo: '   ', observacoes: '\n', especialidade: ' ' }).motivo, null)
assert.equal(dadosValidos({ medico_nome: 'A', motivo: ' precisa de avaliação ' }).motivo, 'precisa de avaliação')

// ── exibição do CRM ──
assert.equal(formatarCrm('12345', 'MG'), '12345/MG')
assert.equal(formatarCrm('12345', null), '12345')
assert.equal(formatarCrm(null, 'MG'), null, 'UF sozinha não vira CRM')
assert.equal(formatarCrm('', 'MG'), null)

// ── edição: o formulário é montado a partir do registro e volta igual ──
const existente: Encaminhamento = {
  id: 'e1', paciente_id: 'p1', medico_nome: 'Dr. João', medico_crm: '999', medico_crm_uf: 'SP', medico_telefone: '3433334444',
  especialidade: 'Neurologia', data_encaminhamento: '2026-08-01', motivo: 'atraso de fala', observacoes: null,
  criado_em: '2026-08-02T10:00:00Z', atualizado_em: null,
}
assert.equal(formDoEncaminhamento(existente).medico_telefone, '(34) 3333-4444', 'a tela mostra o telefone com máscara')
assert.deepEqual(dadosValidos(formDoEncaminhamento(existente)), {
  medico_nome: 'Dr. João', medico_crm: '999', medico_crm_uf: 'SP', medico_telefone: '3433334444', especialidade: 'Neurologia',
  data_encaminhamento: '2026-08-01', motivo: 'atraso de fala', observacoes: null,
})
// registro só com telefone (nome e CRM nulos): abre na tela, volta igual
const soTelefone: Encaminhamento = {
  ...existente, id: 'e2', medico_nome: null, medico_crm: null, medico_crm_uf: null,
  especialidade: null, data_encaminhamento: null, motivo: null,
}
assert.equal(formDoEncaminhamento(soTelefone).medico_nome, '')
assert.equal(dadosValidos(formDoEncaminhamento(soTelefone)).medico_nome, null)
assert.equal(dadosValidos(formDoEncaminhamento(soTelefone)).medico_telefone, '3433334444')

// ── cadastro do paciente: o que sai da tela vira linha, ou nenhuma ──
assert.equal(encaminhamentoTemConteudo(FORM_VAZIO), false)
assert.equal(encaminhamentoTemConteudo(form({ motivo: ' x ' })), true)
assert.equal(encaminhamentoTemConteudo(form({ medico_nome: '   ' })), false)

assert.deepEqual(prepararEncaminhamentoDoCadastro(undefined), { ok: true, dados: null }, 'campo ausente')
assert.deepEqual(prepararEncaminhamentoDoCadastro(null), { ok: true, dados: null })
assert.deepEqual(prepararEncaminhamentoDoCadastro({}), { ok: true, dados: null })
assert.deepEqual(prepararEncaminhamentoDoCadastro({ ...FORM_VAZIO }), { ok: true, dados: null }, 'tudo vazio: nenhuma linha, cadastro segue')
assert.deepEqual(prepararEncaminhamentoDoCadastro({ ...FORM_VAZIO, medico_nome: '   ', medico_telefone: '  ' }), { ok: true, dados: null })
const comTelefone = prepararEncaminhamentoDoCadastro({ medico_telefone: '(34) 3333-4444' })
assert.equal(comTelefone.ok && comTelefone.dados?.medico_telefone, '3433334444')
const soCrm = prepararEncaminhamentoDoCadastro({ medico_crm: '123' })
assert.equal(soCrm.ok && soCrm.dados?.medico_crm, '123')
const soNome = prepararEncaminhamentoDoCadastro({ medico_nome: 'Dra. Ana' })
assert.equal(soNome.ok && soNome.dados?.medico_nome, 'Dra. Ana')
// conteúdo sem nenhum dos três (ex.: só o motivo): erro claro, nada de gravar calado nem de perder o texto
assert.deepEqual(prepararEncaminhamentoDoCadastro({ motivo: 'atraso de fala' }), { ok: false, erro: ERRO_AO_MENOS_UM })
assert.deepEqual(prepararEncaminhamentoDoCadastro({ medico_telefone: '123' }), { ok: false, erro: ERRO_TELEFONE })
// entrada que não veio da nossa tela (corpo da requisição é texto livre)
assert.deepEqual(prepararEncaminhamentoDoCadastro('texto'), { ok: false, erro: 'Encaminhamento inválido.' })
assert.deepEqual(prepararEncaminhamentoDoCadastro([]), { ok: false, erro: 'Encaminhamento inválido.' })
assert.deepEqual(prepararEncaminhamentoDoCadastro({ medico_nome: 42 }), { ok: false, erro: 'Encaminhamento inválido.' })
assert.deepEqual(prepararEncaminhamentoDoCadastro({ medico_nome: { x: 1 } }), { ok: false, erro: 'Encaminhamento inválido.' })

// ── sugestão de médicos: o ilike da tela usa curingas, então a busca precisa escapá-los ──
assert.equal(escaparLike('Silva'), 'Silva')
assert.equal(escaparLike('50%'), '50\\%')
assert.equal(escaparLike('a_b'), 'a\\_b')
assert.equal(escaparLike('a\\b'), 'a\\\\b')

const linha = (medico_nome: string | null, medico_crm: string | null = null) =>
  ({ medico_nome, medico_crm, medico_crm_uf: medico_crm ? 'MG' : null, medico_telefone: null, especialidade: null })
const sugeridos = sugestoesDeMedicos([
  linha('Dr. Silva', '111'),   // mais recente: é o que vale
  linha('dr. silva', '222'),   // mesma pessoa, outra grafia
  linha('  DR. SILVA  '),
  linha('Dra. Costa'),
  linha(''),
  linha(null),                 // registro só com CRM/telefone não vira sugestão
])
assert.deepEqual(sugeridos.map(s => s.medico_nome), ['Dr. Silva', 'Dra. Costa'])
assert.equal(sugeridos[0].medico_crm, '111', 'fica com os dados do encaminhamento mais recente')
assert.equal(sugestoesDeMedicos(Array.from({ length: 20 }, (_, i) => linha(`Dr. ${i}`)), 5).length, 5)
assert.deepEqual(sugestoesDeMedicos([]), [])

console.log('Encaminhamentos: testes passaram')
