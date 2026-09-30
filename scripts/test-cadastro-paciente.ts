/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Exercita POST /api/paciente com o handler real. Só o acesso ao Supabase é substituído
 * por um duplo que registra o que seria gravado. Prova: encaminhamento vazio não cria
 * linha; encaminhamento inválido é recusado ANTES de criar o paciente; falha ao gravar
 * o encaminhamento NÃO derruba o paciente (devolve o paciente_id); só admin e recepção
 * registram encaminhamento (o cliente admin ignora a RLS, então a rota é quem barra).
 */
import assert from 'node:assert/strict'
import Module from 'node:module'
import { NextRequest } from 'next/server'

type Registro = { table: string; payload: any }
type Cenario = {
  usuario: { id: string; role: string; permissoes?: Record<string, boolean> }
  /** tabelas cujo insert falha */
  falhas?: string[]
}

let cenario: Cenario
let registros: Registro[] = []

const gravou = (tabela: string) => registros.filter(r => r.table === tabela)

function clienteAdmin() {
  return {
    rpc: () => ({ maybeSingle: async () => ({ data: null, error: null }) }),
    from: (table: string) => {
      const q: any = {
        select: () => q,
        eq: () => q,
        maybeSingle: async () => ({ data: { role: 'pai' }, error: null }),
        insert: (payload: any) => {
          registros.push({ table, payload })
          const erro = cenario.falhas?.includes(table) ? { code: 'XX000', message: 'detalhe interno do banco' } : null
          if (table === 'pacientes') {
            return { select: () => ({ single: async () => ({ data: erro ? null : { id: 'pac-novo' }, error: erro }) }) }
          }
          return Promise.resolve({ error: erro })
        },
      }
      return q
    },
  }
}

const clienteUsuario = () => ({
  auth: { getUser: async () => ({ data: { user: { id: cenario.usuario.id } } }) },
  from: () => {
    const q: any = {
      select: () => q,
      eq: () => q,
      single: async () => ({ data: { role: cenario.usuario.role, permissoes: cenario.usuario.permissoes ?? {} }, error: null }),
    }
    return q
  },
})

const substitutos: Record<string, unknown> = {
  '@/lib/supabase/server': { createClient: async () => clienteUsuario() },
  '@/lib/supabase/admin': { createAdminClient: () => clienteAdmin() },
}
const carregarOriginal = (Module as any)._load
;(Module as any)._load = function (request: string, ...resto: unknown[]) {
  if (request in substitutos) return substitutos[request]
  return carregarOriginal.call(this, request, ...resto)
}

function requisicao(corpo: unknown) {
  return new NextRequest('http://localhost/api/paciente', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(corpo),
  })
}

function preparar(c: Cenario) {
  cenario = c
  registros = []
}

const corpo = (extra: Record<string, unknown> = {}) => ({
  nome: 'Paciente Teste', horarios_atendimento: [], terapeutas: [], ...extra,
})
const EM_BRANCO = {
  medico_nome: '', medico_crm: '', medico_crm_uf: '', medico_telefone: '',
  especialidade: '', data_encaminhamento: '', motivo: '', observacoes: '',
}
const admin = { id: 'admin-1', role: 'admin' }
const recepcao = { id: 'rec-1', role: 'recepcao' }
const terapeuta = { id: 'ter-1', role: 'terapeuta', permissoes: { cadastrar_pacientes: true } }

async function main() {
  const { POST } = require('../app/api/paciente/route')

  // ── só o telefone, só o CRM, só o nome: cada um basta ──
  preparar({ usuario: admin })
  let res = await POST(requisicao(corpo({ encaminhamento: { ...EM_BRANCO, medico_telefone: '(34) 3333-4444' } })))
  assert.equal(res.status, 200)
  assert.deepEqual(await res.json(), { success: true, paciente_id: 'pac-novo' })
  assert.equal(gravou('encaminhamentos').length, 1)
  assert.deepEqual(gravou('encaminhamentos')[0].payload, {
    paciente_id: 'pac-novo', medico_nome: null, medico_crm: null, medico_crm_uf: null, medico_telefone: '3433334444',
    especialidade: null, data_encaminhamento: null, motivo: null, observacoes: null, registrado_por: 'admin-1',
  })

  preparar({ usuario: recepcao })
  res = await POST(requisicao(corpo({ encaminhamento: { ...EM_BRANCO, medico_crm: '12345', medico_crm_uf: 'mg' } })))
  assert.equal(res.status, 200, 'recepção registra encaminhamento')
  assert.equal(gravou('encaminhamentos')[0].payload.medico_crm, '12345')
  assert.equal(gravou('encaminhamentos')[0].payload.medico_crm_uf, 'MG')
  assert.equal(gravou('encaminhamentos')[0].payload.registrado_por, 'rec-1')

  preparar({ usuario: admin })
  res = await POST(requisicao(corpo({ encaminhamento: { ...EM_BRANCO, medico_nome: 'Dra. Ana' } })))
  assert.equal(res.status, 200)
  assert.equal(gravou('encaminhamentos')[0].payload.medico_nome, 'Dra. Ana')

  // ── os três vazios (ou ausente): paciente criado, NENHUMA linha em encaminhamentos ──
  for (const [rotulo, encaminhamento] of [
    ['em branco', EM_BRANCO], ['espaços', { ...EM_BRANCO, medico_nome: '   ', medico_telefone: ' ' }],
    ['null', null], ['ausente', undefined], ['objeto vazio', {}],
  ] as const) {
    preparar({ usuario: admin })
    res = await POST(requisicao(corpo(encaminhamento === undefined ? {} : { encaminhamento })))
    assert.equal(res.status, 200, `${rotulo}: cadastro normal`)
    assert.equal(gravou('pacientes').length, 1, `${rotulo}: paciente criado`)
    assert.equal(gravou('encaminhamentos').length, 0, `${rotulo}: não cria linha de encaminhamento`)
  }

  // ── inválido: recusado ANTES de criar o paciente ──
  for (const [rotulo, encaminhamento] of [
    ['telefone curto', { ...EM_BRANCO, medico_nome: 'A', medico_telefone: '123' }],
    ['só o motivo', { ...EM_BRANCO, motivo: 'atraso de fala' }],
    ['UF inválida', { ...EM_BRANCO, medico_nome: 'A', medico_crm_uf: 'XX' }],
    ['texto solto', 'Dr. Fulano'],
    ['campo não-texto', { ...EM_BRANCO, medico_nome: 42 }],
  ] as const) {
    preparar({ usuario: admin })
    res = await POST(requisicao(corpo({ encaminhamento })))
    assert.equal(res.status, 400, `${rotulo}: 400`)
    assert.equal(registros.length, 0, `${rotulo}: nada gravado, nem o paciente (o cadastro não fica pela metade)`)
  }

  // ── quem não é admin/recepção não registra encaminhamento (o cliente admin ignora a RLS) ──
  preparar({ usuario: terapeuta })
  res = await POST(requisicao(corpo({ encaminhamento: { ...EM_BRANCO, medico_nome: 'Dr. X' } })))
  assert.equal(res.status, 403)
  assert.equal(registros.length, 0, 'terapeuta: nada gravado')

  preparar({ usuario: terapeuta })
  res = await POST(requisicao(corpo({ encaminhamento: EM_BRANCO })))
  assert.equal(res.status, 200, 'terapeuta sem nada preenchido cadastra normal (é o formulário dela)')
  assert.equal(gravou('encaminhamentos').length, 0)

  // ── falha ao gravar o encaminhamento NÃO derruba o paciente ──
  const consolaOriginal = console.error
  const logados: string[] = []
  console.error = (...args: unknown[]) => { logados.push(args.join(' ')) }
  try {
    preparar({ usuario: admin, falhas: ['encaminhamentos'] })
    res = await POST(requisicao(corpo({
      responsavel_id: 'resp-1',
      encaminhamento: { ...EM_BRANCO, medico_nome: 'Dra. Ana Sigilosa', medico_telefone: '34991234567' },
    })))
    let json = await res.json()
    assert.equal(res.status, 500)
    assert.equal(json.paciente_id, 'pac-novo', 'devolve o paciente_id junto do aviso')
    assert.equal(gravou('pacientes').length, 1, 'o paciente foi criado e não é desfeito')
    assert.equal(gravou('paciente_responsaveis').length, 1, 'o vínculo do responsável ainda foi tentado')
    assert.match(json.error, /O paciente foi cadastrado, mas não foi possível registrar o encaminhamento\./)
    assert.match(json.error, /Dados Clínicos/)
    assert.equal(json.error.includes('vincular'), false, 'só o encaminhamento falhou: a mensagem não cita vínculo')
    assert.equal(json.error.includes('detalhe interno'), false, 'a mensagem crua do banco não vai para a tela')
    assert.equal(logados.some(l => l.includes('Sigilosa') || l.includes('3499123')), false, 'o log não carrega dado do médico')

    // encaminhamento e vínculo falham juntos: a mensagem diz as duas coisas
    preparar({ usuario: admin, falhas: ['encaminhamentos', 'paciente_responsaveis'] })
    res = await POST(requisicao(corpo({ responsavel_id: 'resp-1', encaminhamento: { ...EM_BRANCO, medico_crm: '99' } })))
    json = await res.json()
    assert.equal(res.status, 500)
    assert.equal(json.paciente_id, 'pac-novo')
    assert.match(json.error, /vincular o responsável e registrar o encaminhamento/)
    assert.match(json.error, /faça o vínculo manualmente e registre o encaminhamento/)

    // só o vínculo falha: a mensagem de sempre
    preparar({ usuario: admin, falhas: ['paciente_responsaveis'] })
    res = await POST(requisicao(corpo({ responsavel_id: 'resp-1', encaminhamento: { ...EM_BRANCO, medico_crm: '99' } })))
    json = await res.json()
    assert.equal(res.status, 500)
    assert.match(json.error, /não foi possível vincular o responsável\. Abra o cadastro do paciente e faça o vínculo manualmente\./)
    assert.equal(gravou('encaminhamentos').length, 1, 'o encaminhamento foi gravado mesmo com o vínculo falhando')

    // falha ao criar o paciente: nada de encaminhamento órfão
    preparar({ usuario: admin, falhas: ['pacientes'] })
    res = await POST(requisicao(corpo({ encaminhamento: { ...EM_BRANCO, medico_nome: 'Dra. Ana' } })))
    assert.equal(res.status, 500)
    assert.equal(gravou('encaminhamentos').length, 0)
  } finally {
    console.error = consolaOriginal
  }

  console.log('Cadastro de paciente com encaminhamento: testes passaram')
}

main().catch(erro => {
  console.error(erro)
  process.exit(1)
})
