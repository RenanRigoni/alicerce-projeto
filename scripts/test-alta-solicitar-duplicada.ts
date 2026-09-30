/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * POST /api/alta/solicitar barra a segunda solicitação de alta pendente. A checagem usa
 * maybeSingle() numa consulta sem garantia de unicidade no banco: com DUAS pendentes o
 * postgres-js devolve null (PGRST116), a checagem passava em falso e entrava uma terceira.
 * `.limit(1)` resolve; este teste reproduz o postgrest-js de verdade no duplo.
 */
import assert from 'node:assert/strict'
import Module from 'node:module'
import { NextRequest } from 'next/server'

let pendentes = 0
const inseridos: unknown[] = []

function construtor(table: string) {
  let limitado = false
  const q: any = {
    select: () => q, eq: () => q, in: () => q, order: () => q,
    limit: () => { limitado = true; return q },
    single: async () => ({
      data: table === 'profiles' ? { role: 'pai' } : table === 'pacientes' ? { nome: 'Paciente', status: 'ativo' } : null,
      error: null,
    }),
    maybeSingle: async () => {
      if (table === 'paciente_responsaveis') return { data: { responsavel_id: 'pai-1' }, error: null }
      if (table === 'solicitacoes_alta') {
        // postgrest-js (PostgrestBuilder.ts:485): mais de uma linha sem limit = data null + PGRST116
        if (pendentes > 1 && !limitado) return { data: null, error: { code: 'PGRST116', message: 'multiple (or no) rows returned' } }
        return { data: pendentes > 0 ? { id: 'alta-1' } : null, error: null }
      }
      return { data: null, error: null }
    },
    insert: (payload: unknown) => { inseridos.push(payload); return Promise.resolve({ error: null }) },
  }
  return q
}

const substitutos: Record<string, unknown> = {
  '@/lib/supabase/server': {
    createClient: async () => ({
      auth: { getUser: async () => ({ data: { user: { id: 'pai-1' } } }) },
      from: (table: string) => construtor(table),
    }),
  },
  '@/lib/notificacoes/inserir': { notificarTerapeutasDoPaciente: async () => {} },
}
const carregarOriginal = (Module as any)._load
;(Module as any)._load = function (request: string, ...resto: unknown[]) {
  if (request in substitutos) return substitutos[request]
  return carregarOriginal.call(this, request, ...resto)
}

const requisicao = () => new NextRequest('http://localhost/api/alta/solicitar', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ paciente_id: 'pac-1', motivo: 'Mudança de cidade' }),
})

async function main() {
  const { POST } = require('../app/api/alta/solicitar/route')

  for (const existentes of [1, 2, 3]) {
    pendentes = existentes
    inseridos.length = 0
    const res = await POST(requisicao())
    assert.equal(res.status, 409, `${existentes} pendente(s): a nova solicitação tem de ser barrada`)
    assert.match((await res.json()).error, /aguardando confirmação/)
    assert.equal(inseridos.length, 0, `${existentes} pendente(s): nada pode ser gravado`)
  }

  pendentes = 0
  inseridos.length = 0
  const livre = await POST(requisicao())
  assert.equal(livre.status, 200, 'sem pendente: a solicitação entra')
  assert.equal(inseridos.length, 1)

  console.log('Alta duplicada: testes passaram')
}

main().catch(erro => {
  console.error(erro)
  process.exit(1)
})
