import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  CAMPOS_FICHA_NA_BUSCA,
  camposDeEncaminhamento, camposDeEvolucaoOuRelatorio, camposDeFichaClinica, camposDeOrientacao,
  casaComBusca, filtrarPorBusca, normalizarBusca, resumirBusca, termosDaBusca,
} from '../lib/paciente/busca-prontuario'

const busca = (texto: string) => termosDaBusca(texto)

// ── normalização: acento e maiúscula não importam ──
assert.equal(normalizarBusca('Avaliação'), 'avaliacao')
assert.equal(normalizarBusca('  AVALIAÇÃO   Inicial '), 'avaliacao inicial')
assert.equal(normalizarBusca('coração, ÇÃO, ü, ñ'), 'coracao, cao, u, n')
assert.equal(normalizarBusca('avaliação'), 'avaliacao', 'acento decomposto (c + cedilha combinante) também')
assert.deepEqual(termosDaBusca(''), [])
assert.deepEqual(termosDaBusca('   '), [])
assert.deepEqual(termosDaBusca(' Atraso  de FALA '), ['atraso', 'de', 'fala'])

// ── casamento ──
assert.equal(casaComBusca(busca('avaliacao'), ['Avaliação inicial']), true, 'sem acento acha com acento')
assert.equal(casaComBusca(busca('AVALIAÇÃO'), ['avaliacao inicial']), true, 'com acento e maiúscula acha sem')
assert.equal(casaComBusca(busca('inicial avaliacao'), ['Avaliação inicial']), true, 'qualquer ordem')
assert.equal(casaComBusca(busca('avaliacao final'), ['Avaliação inicial']), false, 'todos os termos precisam casar')
assert.equal(casaComBusca(busca('xyz'), ['Avaliação inicial']), false)
assert.equal(casaComBusca(busca('ava'), ['Avaliação']), true, 'pedaço de palavra')
assert.equal(casaComBusca(busca('ab'), ['xa', 'bx']), false, 'um termo não casa atravessando dois campos')
assert.equal(casaComBusca(busca('x'), [null, undefined, '']), false, 'campos nulos não quebram')
assert.equal(casaComBusca(busca('(34) 3333-4'), ['(34) 3333-4444']), true, 'parênteses e hífen são texto, não regex')
assert.equal(casaComBusca(busca('a.c'), ['abc']), false, 'ponto não é curinga')
assert.equal(casaComBusca(busca('50%'), ['meta de 50% em 3 meses']), true)

// ── termo vazio mostra tudo, e é a mesma lista (nada recopiado) ──
const nada = [{ titulo: 'A', conteudo: null }, { titulo: null, conteudo: null }]
assert.equal(filtrarPorBusca(nada, busca(''), camposDeOrientacao), nada)
assert.equal(filtrarPorBusca(nada, busca('   '), camposDeOrientacao), nada)
assert.equal(casaComBusca([], []), true)

// ── termo sem resultado ──
assert.deepEqual(filtrarPorBusca(nada, busca('inexistente'), camposDeOrientacao), [])

// ── evoluções e relatórios: TODAS as colunas de texto, inclusive as que hoje estão vazias ──
const evolucao = (parcial: Record<string, string | null>) =>
  ({ identificacao: null, obs_clinicas: null, testes: null, resultado_discussao: null, conclusao: null, ...parcial })
const evolucoes = [
  evolucao({ identificacao: 'Sessão 12 — Integração sensorial' }),
  evolucao({ conclusao: 'Boa evolução na coordenação motora fina' }),
  evolucao({ obs_clinicas: 'Criança chegou irritada, recusou o protocolo' }),
  evolucao({ testes: 'Teste de preensão: escore 14' }),
  evolucao({ resultado_discussao: 'Discussão com a família sobre a rotina escolar' }),
  evolucao({}),
]
const acharEvo = (termo: string) => filtrarPorBusca(evolucoes, busca(termo), camposDeEvolucaoOuRelatorio).length
assert.equal(acharEvo('integracao sensorial'), 1, 'identificacao')
assert.equal(acharEvo('COORDENAÇÃO motora'), 1, 'conclusao')
assert.equal(acharEvo('irritada'), 1, 'obs_clinicas (vazia em produção hoje)')
assert.equal(acharEvo('preensao'), 1, 'testes (vazia em produção hoje)')
assert.equal(acharEvo('rotina escolar'), 1, 'resultado_discussao (vazia em produção hoje)')
assert.equal(acharEvo('familia'), 1, 'acento: "família" acha "familia"')
assert.equal(acharEvo('sessao'), 1)
assert.equal(acharEvo(''), 6, 'vazio: todas')
assert.equal(camposDeEvolucaoOuRelatorio({ identificacao: 'a', conclusao: 'b' }).length, 5, 'sem as colunas extras no objeto: ainda 5 campos, os ausentes como undefined')

// relatórios têm as mesmas colunas e o mesmo extrator
const relatorios = [evolucao({ identificacao: 'Relatório semestral — Fonoaudiologia' }), evolucao({ conclusao: 'Alta recomendada' })]
assert.equal(filtrarPorBusca(relatorios, busca('fonoaudiologia'), camposDeEvolucaoOuRelatorio).length, 1)
assert.equal(filtrarPorBusca(relatorios, busca('ALTA'), camposDeEvolucaoOuRelatorio).length, 1)

// ── orientações: título e conteúdo ──
const orientacoes = [
  { titulo: 'Rotina do sono', conteudo: 'Evitar telas 1 hora antes de dormir' },
  { titulo: 'Jogo de encaixe', conteudo: null },
  { titulo: 'Alimentação', conteudo: 'Oferecer texturas novas' },
]
const acharOri = (termo: string) => filtrarPorBusca(orientacoes, busca(termo), camposDeOrientacao).map(o => o.titulo)
assert.deepEqual(acharOri('alimentacao'), ['Alimentação'], 'título, sem acento')
assert.deepEqual(acharOri('telas'), ['Rotina do sono'], 'conteúdo')
assert.deepEqual(acharOri('encaixe'), ['Jogo de encaixe'], 'item sem conteúdo')
assert.deepEqual(acharOri('nao existe'), [])

// ── encaminhamentos: nome, CRM (com UF), telefone (como digitado e como aparece), especialidade, motivo, observações ──
const enc = (parcial: Record<string, string | null>) => ({
  medico_nome: null, medico_crm: null, medico_crm_uf: null, medico_telefone: null,
  especialidade: null, motivo: null, observacoes: null, ...parcial,
})
const encaminhamentos = [
  enc({ medico_nome: 'Dra. Ângela Ribeiro', medico_crm: '12345', medico_crm_uf: 'MG', especialidade: 'Neuropediatria' }),
  enc({ medico_telefone: '3433334444', motivo: 'Suspeita de TEA' }),
  enc({ medico_crm: '777', observacoes: 'Pediatra da escola; retorno em março' }),
]
const acharEnc = (termo: string) => filtrarPorBusca(encaminhamentos, busca(termo), camposDeEncaminhamento).length
assert.equal(acharEnc('angela'), 1, 'nome, sem acento')
assert.equal(acharEnc('12345/mg'), 1, 'CRM com UF, como aparece na tela')
assert.equal(acharEnc('12345'), 1, 'CRM')
assert.equal(acharEnc('neuropediatria'), 1, 'especialidade')
assert.equal(acharEnc('3433334444'), 1, 'telefone só dígitos')
assert.equal(acharEnc('(34) 3333-4444'), 1, 'telefone formatado, como a recepção vê')
assert.equal(acharEnc('suspeita de tea'), 1, 'motivo')
assert.equal(acharEnc('retorno em marco'), 1, 'observações, sem acento')
assert.equal(acharEnc('777'), 1, 'item sem nome')
assert.equal(acharEnc('cardiologia'), 0)
assert.equal(acharEnc(''), 3)

// ── ficha de dados clínicos: 1 registro por paciente, todos os campos de texto + a data como aparece na tela ──
const CAMPOS_DA_FICHA = [
  'hipotese_diagnostica', 'diagnostico', 'objetivos_terapeuticos', 'plano_terapeutico', 'demandas_prioritarias',
  'obs_clinicas_gerais', 'estrategias_utilizadas', 'orientacoes_para_casa', 'evolucao_resumida', 'metas_curto_prazo',
  'metas_medio_prazo', 'sensibilidades_restricoes', 'nivel_suporte', 'obs_comportamento_regulacao',
  'informacoes_escolares', 'pontos_atencao_equipe',
] as const
const ficha = (parcial: Record<string, string | null>) => {
  const vazia: Record<string, string | null> = { data_avaliacao_inicial: null }
  for (const c of CAMPOS_DA_FICHA) vazia[c] = null
  return { ...vazia, ...parcial } as Parameters<typeof camposDeFichaClinica>[0]
}
const achouNaFicha = (f: ReturnType<typeof ficha>, termo: string) => casaComBusca(busca(termo), camposDeFichaClinica(f))

// cada campo, sozinho, é achado (o campo vazio hoje em produção é exatamente o que a busca não pode ignorar)
for (const campo of CAMPOS_DA_FICHA) {
  const marca = `zq${campo.replace(/_/g, '')}`
  assert.equal(achouNaFicha(ficha({ [campo]: `texto ${marca} final` }), marca), true, `ficha.${campo}`)
  assert.equal(achouNaFicha(ficha({}), marca), false, `ficha vazia não casa ${campo}`)
}
assert.equal(achouNaFicha(ficha({ diagnostico: 'Transtorno do Espectro Autista' }), 'espectro autista'), true)
assert.equal(achouNaFicha(ficha({ informacoes_escolares: 'Cursa o 3º ano; adaptação curricular' }), 'adaptacao'), true, 'sem acento')
assert.equal(achouNaFicha(ficha({ metas_curto_prazo: 'Atingir 50% da meta' }), '50%'), true)
assert.equal(achouNaFicha(ficha({ diagnostico: 'TEA' }), 'tdah'), false)
// a data aparece como na tela (dd/mm/aaaa); quem busca o ano ou a data completa acha
assert.equal(achouNaFicha(ficha({ data_avaliacao_inicial: '2026-03-15' }), '15/03/2026'), true, 'data como na tela')
assert.equal(achouNaFicha(ficha({ data_avaliacao_inicial: '2026-03-15' }), '2026'), true)
assert.equal(achouNaFicha(ficha({ data_avaliacao_inicial: '2026-03-15' }), '16/03/2026'), false)
// nenhum campo, nenhum casamento atravessando dois campos
assert.equal(achouNaFicha(ficha({ diagnostico: 'ab', plano_terapeutico: 'cd' }), 'abcd'), false)
// busca vazia: a ficha casa (filtro desligado)
assert.equal(achouNaFicha(ficha({}), ''), true)

// a lista de campos da busca tem de acompanhar a ficha: campo novo na tela sem entrar aqui = busca que mente
const interfaceDados = /export interface DadosClinicos \{([^}]*)\}/.exec(readFileSync('components/paciente/PerfilPacienteTabs.tsx', 'utf8'))
assert.ok(interfaceDados, 'interface DadosClinicos encontrada')
const camposDaTela = [...interfaceDados[1].matchAll(/^\s*(\w+):/gm)].map(m => m[1]).filter(c => c !== 'atualizado_em').sort()
assert.deepEqual([...CAMPOS_FICHA_NA_BUSCA].sort(), camposDaTela, 'CAMPOS_FICHA_NA_BUSCA cobre todos os campos de DadosClinicos')
const camposDoFormulario = [...readFileSync('components/paciente/AbaDadosClinicos.tsx', 'utf8').matchAll(/\{ key: '(\w+)',\s+label/g)].map(m => m[1]).sort()
assert.deepEqual([...CAMPOS_FICHA_NA_BUSCA].sort(), camposDoFormulario, 'e todos os campos do formulário da ficha')

// ── resumo: quantos e em qual aba ──
assert.deepEqual(resumirBusca({ relatorios: 0, evolucoes: 0, orientacoes: 0, encaminhamentos: 0, ficha: 0 }), { total: 0, porAba: [] })
assert.deepEqual(resumirBusca({ relatorios: 0, evolucoes: 0, orientacoes: 0, encaminhamentos: 0, ficha: 1 }), {
  total: 1,
  porAba: [{ aba: 'Dados Clínicos', n: 1, rotulo: 'ficha de dados clínicos' }],
}, 'só a ficha casou: conta como 1 item na aba Dados Clínicos')
assert.deepEqual(resumirBusca({ relatorios: 0, evolucoes: 0, orientacoes: 0, encaminhamentos: 2, ficha: 1 }), {
  total: 3,
  porAba: [{ aba: 'Dados Clínicos', n: 3, rotulo: 'ficha e 2 encaminhamentos' }],
}, 'ficha e encaminhamentos moram na mesma aba: um só item no resumo, sem chave repetida')
assert.deepEqual(resumirBusca({ relatorios: 0, evolucoes: 0, orientacoes: 0, encaminhamentos: 1, ficha: 1 }).porAba[0].rotulo, 'ficha e 1 encaminhamento')
assert.deepEqual(resumirBusca({ relatorios: 1, evolucoes: 3, orientacoes: 0, encaminhamentos: 1, ficha: 0 }), {
  total: 5,
  porAba: [
    { aba: 'Relatórios', n: 1, rotulo: '1 relatório' },
    { aba: 'Evolução', n: 3, rotulo: '3 evoluções' },
    { aba: 'Dados Clínicos', n: 1, rotulo: '1 encaminhamento' },
  ],
})
assert.equal(resumirBusca({ relatorios: 0, evolucoes: 0, orientacoes: 2, encaminhamentos: 0, ficha: 0 }).porAba[0].rotulo, '2 orientações')

// ── o termo nunca sai da tela (o que a pessoa procura é clínico) ──
const proibidos: Array<[string, RegExp]> = [
  ['fetch', /\bfetch\s*\(/], ['console', /\bconsole\./], ['localStorage', /localStorage/], ['sessionStorage', /sessionStorage/],
  ['URL da página', /useSearchParams|URLSearchParams|router\.(push|replace)|history\.(push|replace)State/],
  ['cliente Supabase', /supabase/i], ['cookie', /document\.cookie/],
]
for (const arquivo of ['lib/paciente/busca-prontuario.ts', 'components/paciente/BuscaProntuario.tsx']) {
  const fonte = readFileSync(arquivo, 'utf8')
  for (const [nome, padrao] of proibidos) {
    assert.equal(padrao.test(fonte), false, `${arquivo} não pode usar ${nome}: o termo buscado não sai da tela`)
  }
}

console.log('Busca no prontuário: testes passaram')
