import assert from 'node:assert/strict'
import {
  FORM_VAZIO, LIMITES, UFS,
  escaparLike, formDoEncaminhamento, formatarCrm, mascaraCrm, sugestoesDeMedicos, validarEncaminhamento,
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

// ── só o nome é obrigatório: CRM, UF, especialidade, data, motivo e observações são opcionais ──
assert.equal(erroDe({}), 'Informe o nome do médico.')
assert.equal(erroDe({ medico_nome: '   ' }), 'Informe o nome do médico.')
assert.deepEqual(dadosValidos({ medico_nome: '  Dra. Ana  ' }), {
  medico_nome: 'Dra. Ana', medico_crm: null, medico_crm_uf: null, especialidade: null,
  data_encaminhamento: null, motivo: null, observacoes: null,
})

// ── CRM: opcional, só números; o que vier formatado é limpo ──
assert.equal(dadosValidos({ medico_nome: 'A', medico_crm: '12345' }).medico_crm, '12345')
assert.equal(dadosValidos({ medico_nome: 'A', medico_crm: 'CRM 12.345' }).medico_crm, '12345')
assert.equal(dadosValidos({ medico_nome: 'A', medico_crm: '' }).medico_crm, null)
assert.equal(erroDe({ medico_nome: 'A', medico_crm: 'abc' }), 'CRM deve ter apenas números.')
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
  id: 'e1', paciente_id: 'p1', medico_nome: 'Dr. João', medico_crm: '999', medico_crm_uf: 'SP',
  especialidade: 'Neurologia', data_encaminhamento: '2026-08-01', motivo: 'atraso de fala', observacoes: null,
  criado_em: '2026-08-02T10:00:00Z', atualizado_em: null,
}
assert.deepEqual(dadosValidos(formDoEncaminhamento(existente)), {
  medico_nome: 'Dr. João', medico_crm: '999', medico_crm_uf: 'SP', especialidade: 'Neurologia',
  data_encaminhamento: '2026-08-01', motivo: 'atraso de fala', observacoes: null,
})

// ── sugestão de médicos: o ilike da tela usa curingas, então a busca precisa escapá-los ──
assert.equal(escaparLike('Silva'), 'Silva')
assert.equal(escaparLike('50%'), '50\\%')
assert.equal(escaparLike('a_b'), 'a\\_b')
assert.equal(escaparLike('a\\b'), 'a\\\\b')

const linha = (medico_nome: string, medico_crm: string | null = null) =>
  ({ medico_nome, medico_crm, medico_crm_uf: medico_crm ? 'MG' : null, especialidade: null })
const sugeridos = sugestoesDeMedicos([
  linha('Dr. Silva', '111'),   // mais recente: é o que vale
  linha('dr. silva', '222'),   // mesma pessoa, outra grafia
  linha('  DR. SILVA  '),
  linha('Dra. Costa'),
  linha(''),
])
assert.deepEqual(sugeridos.map(s => s.medico_nome), ['Dr. Silva', 'Dra. Costa'])
assert.equal(sugeridos[0].medico_crm, '111', 'fica com os dados do encaminhamento mais recente')
assert.equal(sugestoesDeMedicos(Array.from({ length: 20 }, (_, i) => linha(`Dr. ${i}`)), 5).length, 5)
assert.deepEqual(sugestoesDeMedicos([]), [])

console.log('Encaminhamentos: testes passaram')
