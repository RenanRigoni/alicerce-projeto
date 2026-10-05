/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Desmarcar na Agenda Geral.
 *
 * A recepção monta a agenda de todas as profissionais e precisa desfazer: antes ela
 * criava um agendamento e não tinha nenhum botão para apagar, nem no celular nem no
 * computador. A trava é `editar_agendamentos_alheios`, ligada por pessoa no painel.
 *
 * Roda o handler real. Guarda as três formas de desmarcar e, principalmente, que
 * ninguém sem a permissão encosta no banco.
 */
import assert from 'node:assert/strict'
import Module from 'node:module'
import { NextRequest } from 'next/server'

type Resposta = { data: unknown[] | null; error: { message: string } | null }

let papel = 'recepcao'
let permissoes: Record<string, boolean> = {}
let escritas = 0
let apagados: Resposta = { data: [{ id: 'a-1' }], error: null }
let atualizados: Resposta = { data: [{ paciente_id: 'p-1' }], error: null }
let upsertErro: { message: string } | null = null
let vinculo: { horarios_atendimento: Array<{ dia: string; hora: string }> } | null = null
let auditadas: Array<{ acao: string; tipo: string }> = []

const construtor = (tabela: string) => {
  let operacao: 'delete' | 'update' | null = null
  const q: any = {
    select: () => q,
    eq: () => q,
    maybeSingle: async () => ({ data: tabela === 'paciente_terapeutas' ? vinculo : null, error: null }),
    single: async () => ({ data: { role: papel, permissoes }, error: null }),
    delete: () => { escritas++; operacao = 'delete'; return q },
    update: () => { escritas++; operacao = 'update'; return q },
    upsert: async () => { escritas++; return { error: upsertErro } },
    then: (resolve: (v: Resposta) => void) =>
      resolve(operacao === 'delete' ? apagados : atualizados),
  }
  return q
}

const cliente = {
  auth: { getUser: async () => ({ data: { user: { id: 'u-1' } } }) },
  from: construtor,
}

const substitutos: Record<string, unknown> = {
  '@/lib/supabase/server': { createClient: async () => cliente },
  '@/lib/supabase/admin': { createAdminClient: () => cliente },
  '@/lib/audit/registrar-acao': {
    registrarAcao: async (acao: string, tipo: string) => { auditadas.push({ acao, tipo }) },
  },
}
const carregarOriginal = (Module as any)._load
;(Module as any)._load = function (request: string, ...resto: unknown[]) {
  if (request in substitutos) return substitutos[request]
  return carregarOriginal.call(this, request, ...resto)
}

const req = (corpo: unknown) =>
  new NextRequest('http://localhost/api/agendamento', {
    method: 'DELETE',
    body: JSON.stringify(corpo),
    headers: { 'Content-Type': 'application/json' },
  })

function reset() {
  papel = 'recepcao'
  permissoes = {}
  escritas = 0
  apagados = { data: [{ id: 'a-1' }], error: null }
  atualizados = { data: [{ paciente_id: 'p-1' }], error: null }
  upsertErro = null
  vinculo = { horarios_atendimento: [{ dia: 'terca', hora: '14:00' }] }
  auditadas = []
}

const AVULSO = { alvo: 'avulso', id: 'a-1' }
const OCORRENCIA = {
  alvo: 'ocorrencia', paciente_id: 'p-1', terapeuta_id: 't-1', data_hora: '2026-10-13T17:00:00.000Z',
}
const RECORRENTE = {
  alvo: 'recorrente', paciente_id: 'p-1', terapeuta_id: 't-1', horario: { dia: 'terca', hora: '14:00' },
}

async function main() {
  const { DELETE } = require('../app/api/agendamento/route')

  // ── a recepção desmarca das três formas ──────────────────────────────────
  for (const [nome, corpo] of [['avulso', AVULSO], ['ocorrência', OCORRENCIA], ['recorrência', RECORRENTE]] as const) {
    reset()
    const res = await DELETE(req(corpo))
    assert.equal(res.status, 200, `recepção desmarca ${nome}`)
    assert.deepEqual(await res.json(), { success: true, alvo: corpo.alvo })
    assert.equal(escritas, 1, `${nome}: uma escrita`)
    assert.equal(auditadas.length, 1, `${nome}: deixa rastro de quem apagou`)
    assert.equal(auditadas[0].acao, 'excluiu')
  }

  // ── sem a permissão não passa, e NÃO encosta no banco ────────────────────
  for (const [nome, corpo] of [['avulso', AVULSO], ['ocorrência', OCORRENCIA], ['recorrência', RECORRENTE]] as const) {
    reset()
    permissoes = { editar_agendamentos_alheios: false }
    const res = await DELETE(req(corpo))
    const json = await res.json()
    assert.equal(res.status, 403, `${nome} barrado sem permissão`)
    assert.equal(escritas, 0, `${nome}: nem tentou escrever`)
    assert.notEqual(json.success, true)
    assert.match(json.error, /permiss/i)
  }

  // a profissional não administra a agenda das outras por esta rota
  reset()
  papel = 'terapeuta'
  let res = await DELETE(req(AVULSO))
  assert.equal(res.status, 403, 'terapeuta não mexe na agenda geral')
  assert.equal(escritas, 0)

  // o portal da família muito menos
  reset()
  papel = 'pai'
  res = await DELETE(req(AVULSO))
  assert.equal(res.status, 403, 'responsável não desmarca por aqui')
  assert.equal(escritas, 0)

  // ── alvo inválido ────────────────────────────────────────────────────────
  reset()
  res = await DELETE(req({ alvo: 'tudo' }))
  assert.equal(res.status, 400)
  assert.equal(escritas, 0, 'alvo inventado não vira escrita')

  // ── 0 linhas apagadas não é sucesso ──────────────────────────────────────
  reset()
  apagados = { data: [], error: null }
  res = await DELETE(req(AVULSO))
  let json = await res.json()
  assert.notEqual(json.success, true, '0 linhas não é sucesso')
  assert.equal(res.status, 404)
  assert.equal(auditadas.length, 0, 'não audita o que não apagou')

  reset()
  apagados = { data: null, error: null }
  res = await DELETE(req(AVULSO))
  assert.equal(res.status, 404, 'data nulo também conta como nada apagado')

  // ── erro do banco: 500 sem vazar a mensagem crua ─────────────────────────
  reset()
  apagados = { data: null, error: { message: 'permission denied for table agendamentos' } }
  res = await DELETE(req(AVULSO))
  assert.equal(res.status, 500)
  assert.equal((await res.json()).error.includes('permission denied'), false)

  reset()
  upsertErro = { message: 'duplicate key value violates unique constraint' }
  res = await DELETE(req(OCORRENCIA))
  assert.equal(res.status, 500)
  assert.equal((await res.json()).error.includes('duplicate key'), false)

  // ── horário fixo que não existe naquela agenda ───────────────────────────
  reset()
  vinculo = { horarios_atendimento: [{ dia: 'quinta', hora: '09:00' }] }
  res = await DELETE(req(RECORRENTE))
  json = await res.json()
  assert.equal(res.status, 404, 'não remove horário que não está lá')
  assert.equal(escritas, 0)
  assert.match(json.error, /não está na agenda/i)

  reset()
  vinculo = null
  res = await DELETE(req(RECORRENTE))
  assert.equal(res.status, 404, 'sem vínculo, nada a remover')
  assert.equal(escritas, 0)

  // ── campos obrigatórios ──────────────────────────────────────────────────
  reset()
  res = await DELETE(req({ alvo: 'ocorrencia', paciente_id: 'p-1', data_hora: OCORRENCIA.data_hora }))
  assert.equal(res.status, 400, 'ocorrência sem profissional é recusada')
  assert.equal(escritas, 0)

  reset()
  res = await DELETE(req({ ...OCORRENCIA, data_hora: 'ontem de manhã' }))
  assert.equal(res.status, 400, 'data inválida é recusada')
  assert.equal(escritas, 0)

  reset()
  res = await DELETE(req({ ...RECORRENTE, horario: { dia: 'domingo', hora: '03:00' } }))
  assert.equal(res.status, 400, 'dia em que a clínica não atende é recusado')
  assert.equal(escritas, 0)

  // ── a tela precisa oferecer o botão, senão o back-end não serve de nada ──
  const fs = require('node:fs')
  const semComentarios = (txt: string) =>
    txt.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '')

  const paginaAdmin = semComentarios(fs.readFileSync('app/(admin)/admin/agendamentos/page.tsx', 'utf8'))
  assert.match(
    paginaAdmin,
    /podeDesmarcar=\{perfil\.efetivas\.editar_agendamentos_alheios/,
    'a agenda geral liga o desmarcar pela permissão, não pelo cargo',
  )
  assert.match(paginaAdmin, /origem: 'recorrente' as const/, 'sessão do horário fixo vai marcada como recorrente')
  assert.match(paginaAdmin, /origem: 'agendamento' as const/, 'agendamento avulso vai marcado como gravado')

  const clienteAdmin = semComentarios(fs.readFileSync('app/(admin)/admin/agendamentos/AgendaAdminClient.tsx', 'utf8'))
  assert.match(clienteAdmin, /desmarcarEndpoint="\/api\/agendamento"/, 'a agenda geral usa a rota dela, não a da profissional')
  assert.match(clienteAdmin, /podeDesmarcar=\{podeDesmarcar\}/, 'a permissão chega até o calendário')

  const calendario = semComentarios(fs.readFileSync('components/terapia/CalendarioAgenda.tsx', 'utf8'))
  assert.match(
    calendario,
    /\{podeDesmarcar && evento\.paciente && evento\.tipo !== 'bloqueio' && \(/,
    'o modal mostra as ações de desmarcar quando a permissão está ligada',
  )
  assert.match(calendario, /onDesmarcar\?\.\('ocorrencia'\)/, 'botão de desmarcar só aquele dia')
  assert.match(calendario, /onDesmarcar\?\.\('recorrente'\)/, 'botão de apagar a recorrência')
  assert.match(calendario, /onDesmarcar\?\.\('avulso'\)/, 'botão de remover o agendamento avulso')
  assert.match(
    calendario,
    /const res = await fetch\(desmarcarEndpoint,/,
    'o DELETE vai para a rota que a tela indicou',
  )

  // a recepção não ganha o fluxo de agendar tocando em horário vago: aquele POST
  // é da rota da profissional e responderia 403 para ela
  assert.doesNotMatch(clienteAdmin, /podeMontarAgenda/, 'a agenda geral não liga o montar-agenda da profissional')

  // ── a permissão existe para a recepção, senão o botão nunca aparece ──────
  const { temPermissao, permissaoAplicavel } = require('../lib/permissoes/definicoes')
  assert.equal(permissaoAplicavel('recepcao', 'editar_agendamentos_alheios'), true,
    'a permissão aparece no painel para a recepção')
  assert.equal(temPermissao('recepcao', {}, 'editar_agendamentos_alheios'), true,
    'recepção já vem com a permissão ligada')
  assert.equal(temPermissao('recepcao', { editar_agendamentos_alheios: false }, 'editar_agendamentos_alheios'), false,
    'e dá para desligar por pessoa')
  assert.equal(temPermissao('admin', {}, 'editar_agendamentos_alheios'), true)
  assert.equal(temPermissao('pai', {}, 'editar_agendamentos_alheios'), false)

  console.log('Agenda geral — desmarcar: testes passaram')
}

main().catch(erro => { console.error(erro); process.exit(1) })
