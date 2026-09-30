/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any */
/**
 * Exercita as rotas e a action que gravam CEP com os handlers reais. Só o acesso ao
 * Supabase é substituído por um duplo que registra o que seria gravado: assim dá
 * para provar, sem sessão de usuário, que o servidor recusa CEP inválido ANTES de
 * gravar e que o valor gravado é sempre 8 dígitos sem hífen.
 */
import assert from 'node:assert/strict'
import Module from 'node:module'
import { NextRequest } from 'next/server'

type Registro = { via: 'usuario' | 'admin'; op: 'update' | 'upsert' | 'insert'; table: string; payload: any }
type Cenario = {
  usuario: { id: string; role: string; permissoes?: Record<string, boolean> }
  respostas: Record<string, any>
}

let cenario: Cenario
let registros: Registro[] = []
let chamadasAuthAdmin: string[] = []

function construtor(via: Registro['via'], table: string) {
  const q: any = {
    select: () => q, eq: () => q, in: () => q, neq: () => q, order: () => q, limit: () => q,
    single: async () => ({ data: cenario.respostas[table] ?? null, error: null }),
    maybeSingle: async () => ({ data: cenario.respostas[`${table}?`] ?? cenario.respostas[table] ?? null, error: null }),
    update: (payload: any) => { registros.push({ via, op: 'update', table, payload }); return q },
    insert: (payload: any) => { registros.push({ via, op: 'insert', table, payload }); return Promise.resolve({ error: null }) },
    upsert: (payload: any) => { registros.push({ via, op: 'upsert', table, payload }); return Promise.resolve({ error: null }) },
    then: (resolve: (v: any) => void) => resolve({ data: cenario.respostas[`${table}[]`] ?? [], error: null }),
  }
  return q
}

const clienteUsuario = () => {
  // a 1ª leitura `single()` de profiles é o perfil de quem chama; a seguinte é o
  // alvo, vindo de `respostas.alvo`. O contador vale para o cliente todo, não por from().
  let leiturasDePerfil = 0
  return {
    auth: { getUser: async () => ({ data: { user: { id: cenario.usuario.id } } }) },
    from: (table: string) => {
      const q = construtor('usuario', table)
      if (table === 'profiles') {
        q.single = async () => (
          leiturasDePerfil++ === 0
            ? { data: { role: cenario.usuario.role, permissoes: cenario.usuario.permissoes ?? {} }, error: null }
            : { data: cenario.respostas.alvo ?? null, error: null }
        )
      }
      return q
    },
  }
}

const clienteAdmin = () => ({
  auth: {
    admin: {
      createUser: async () => { chamadasAuthAdmin.push('createUser'); return { data: { user: { id: 'novo-id' } }, error: null } },
      updateUserById: async () => { chamadasAuthAdmin.push('updateUserById'); return { error: null } },
      getUserById: async () => ({ data: { user: { user_metadata: {} } }, error: null }),
      deleteUser: async () => { chamadasAuthAdmin.push('deleteUser'); return { error: null } },
    },
  },
  from: (table: string) => construtor('admin', table),
})

const substitutos: Record<string, unknown> = {
  '@/lib/supabase/server': { createClient: async () => clienteUsuario() },
  '@/lib/supabase/admin': { createAdminClient: () => clienteAdmin() },
  '@/lib/auth/convite': {
    DOMINIO_EMAIL_INTERNO: 'interno.test',
    enviarConviteAcesso: async () => ({ email_enviado: false, link_recuperacao: 'https://exemplo/link' }),
  },
  'next/cache': { revalidatePath: () => {} },
}

const carregarOriginal = (Module as any)._load
;(Module as any)._load = function (request: string, ...resto: unknown[]) {
  if (request in substitutos) return substitutos[request]
  return carregarOriginal.call(this, request, ...resto)
}

function requisicao(metodo: string, corpo: unknown) {
  return new NextRequest('http://localhost/api/teste', {
    method: metodo,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(corpo),
  })
}

function preparar(c: Cenario) {
  cenario = c
  registros = []
  chamadasAuthAdmin = []
}

const gravacoesEmDetalhes = () => registros.filter(r => r.table === 'responsaveis_detalhes')

const CEP_7_DIGITOS = '38742-24' // o valor malformado real que existe no banco
const MENSAGEM_7 = 'CEP incompleto — faltam 1 dígito.'

async function main() {
  // ── /api/admin/criar-usuario ──────────────────────────────────────────────
  const { POST: criarUsuario } = require('../app/api/admin/criar-usuario/route')
  const admin = { id: 'admin-1', role: 'admin' }
  const corpoNovoPai = (cep: unknown) => ({ role: 'pai', nome: 'Maria', email: 'maria@ex.com', telefone: '(34) 99999-9999', cep })

  preparar({ usuario: admin, respostas: {} })
  let res = await criarUsuario(requisicao('POST', corpoNovoPai(CEP_7_DIGITOS)))
  assert.equal(res.status, 400)
  assert.equal((await res.json()).error, MENSAGEM_7)
  assert.deepEqual(chamadasAuthAdmin, [], 'criar-usuario: CEP inválido não pode nem criar a conta no Auth')
  assert.equal(registros.length, 0)

  preparar({ usuario: admin, respostas: {} })
  res = await criarUsuario(requisicao('POST', corpoNovoPai('38742-2401'))) // 9 dígitos
  assert.equal(res.status, 400)
  assert.deepEqual(chamadasAuthAdmin, [])

  preparar({ usuario: admin, respostas: {} })
  res = await criarUsuario(requisicao('POST', corpoNovoPai('38742-240'))) // com hífen
  assert.equal(res.status, 200)
  assert.equal(gravacoesEmDetalhes()[0].payload.cep, '38742240', 'criar-usuario grava 8 dígitos sem hífen')

  preparar({ usuario: admin, respostas: {} })
  res = await criarUsuario(requisicao('POST', corpoNovoPai('')))
  assert.equal(res.status, 200, 'CEP vazio continua valendo (é opcional)')
  assert.equal(gravacoesEmDetalhes()[0].payload.cep, null)

  preparar({ usuario: admin, respostas: {} })
  res = await criarUsuario(requisicao('POST', { role: 'pai', nome: 'Sem Cep', email: 'x@ex.com' })) // campo ausente
  assert.equal(res.status, 200)
  assert.equal(gravacoesEmDetalhes()[0].payload.cep, null)

  preparar({ usuario: admin, respostas: {} })
  res = await criarUsuario(requisicao('POST', corpoNovoPai(38742240))) // número no JSON, não string
  assert.equal(res.status, 200)
  assert.equal(gravacoesEmDetalhes()[0].payload.cep, '38742240')

  preparar({ usuario: admin, respostas: {} })
  res = await criarUsuario(requisicao('POST', corpoNovoPai({ x: 1 }))) // lixo: 400, não 500
  assert.equal(res.status, 400)

  // ── /api/usuario/[id] (edição pelo admin) ─────────────────────────────────
  const { PATCH: editarUsuario } = require('../app/api/usuario/[id]/route')
  const contexto = { params: Promise.resolve({ id: 'resp-1' }) }
  const detalhes = (cep: unknown) => ({
    nome: 'Maria', email: 'maria@ex.com',
    detalhes_responsavel: { telefone_principal: '(34) 99999-9999', endereco: 'Rua A', numero: '1', complemento: '', cidade: 'Uberlândia', cep, contato_emergencia: null },
  })

  preparar({ usuario: admin, respostas: { alvo: { role: 'pai' } } })
  res = await editarUsuario(requisicao('PATCH', detalhes(CEP_7_DIGITOS)), contexto)
  assert.equal(res.status, 400)
  assert.equal((await res.json()).error, MENSAGEM_7)
  assert.deepEqual(chamadasAuthAdmin, [], 'usuario/[id]: nada é gravado nem no Auth quando o CEP é inválido')
  assert.equal(registros.length, 0)

  preparar({ usuario: admin, respostas: { alvo: { role: 'pai' } } })
  res = await editarUsuario(requisicao('PATCH', detalhes('38551-152')), contexto)
  assert.equal(res.status, 200)
  const upsertUsuario = gravacoesEmDetalhes()[0]
  assert.equal(upsertUsuario.via, 'admin')
  assert.equal(upsertUsuario.payload.id, 'resp-1')
  assert.equal(upsertUsuario.payload.cep, '38551152', 'usuario/[id] normaliza o formato antigo com hífen')
  assert.equal(upsertUsuario.payload.complemento, null, 'texto vazio vira null, como a tela fazia')

  preparar({ usuario: admin, respostas: { alvo: { role: 'pai' } } })
  res = await editarUsuario(requisicao('PATCH', detalhes('')), contexto)
  assert.equal(res.status, 200)
  assert.equal(gravacoesEmDetalhes()[0].payload.cep, null)

  // ── /api/terapeuta/responsavel/[id] ───────────────────────────────────────
  const { PATCH: editarComoTerapeuta } = require('../app/api/terapeuta/responsavel/[id]/route')
  const terapeuta = { id: 'ter-1', role: 'terapeuta', permissoes: { gerenciar_responsaveis: true } }
  const respostasTerapeuta = {
    'paciente_terapeutas[]': [{ paciente_id: 'pac-1' }],
    paciente_responsaveis: { responsavel_id: 'resp-1' },
  }

  preparar({ usuario: terapeuta, respostas: respostasTerapeuta })
  res = await editarComoTerapeuta(requisicao('PATCH', { nome: 'Maria', cep: '123' }), contexto)
  assert.equal(res.status, 400)
  assert.equal((await res.json()).error, 'CEP incompleto — faltam 5 dígitos.')
  assert.equal(registros.length, 0)

  preparar({ usuario: terapeuta, respostas: respostasTerapeuta })
  res = await editarComoTerapeuta(requisicao('PATCH', { nome: ' Maria Souza ', endereco: 'Rua B', cidade: 'X', cep: '38400-000' }), contexto)
  assert.equal(res.status, 200)
  const nomeGravado = registros.find(r => r.table === 'profiles')!
  const detalhesGravados = gravacoesEmDetalhes()[0]
  assert.equal(nomeGravado.via, 'admin', 'a escrita não pode usar o cliente da profissional: a RLS a descartaria em silêncio')
  assert.equal(nomeGravado.payload.nome, 'Maria Souza')
  assert.equal(detalhesGravados.via, 'admin')
  assert.equal(detalhesGravados.payload.id, 'resp-1', 'a chave é id (a tabela não tem responsavel_id)')
  assert.equal('responsavel_id' in detalhesGravados.payload, false)
  assert.equal(detalhesGravados.payload.cep, '38400000')

  preparar({ usuario: terapeuta, respostas: respostasTerapeuta })
  res = await editarComoTerapeuta(requisicao('PATCH', { nome: '   ' }), contexto)
  assert.equal(res.status, 400, 'nome vazio não pode ser gravado agora que a escrita funciona')

  preparar({ usuario: terapeuta, respostas: { ...respostasTerapeuta, paciente_responsaveis: null } })
  res = await editarComoTerapeuta(requisicao('PATCH', { cep: '38400-000' }), contexto)
  assert.equal(res.status, 403, 'sem vínculo com paciente dela continua 403, e nada é gravado')
  assert.equal(registros.length, 0)

  preparar({ usuario: { id: 'ter-2', role: 'terapeuta', permissoes: {} }, respostas: respostasTerapeuta })
  res = await editarComoTerapeuta(requisicao('PATCH', { cep: '38400-000' }), contexto)
  assert.equal(res.status, 403, 'sem gerenciar_responsaveis continua 403')
  assert.equal(registros.length, 0)

  // ── /api/portal/meus-dados (a família edita o próprio endereço) ───────────
  const { PATCH: meusDados } = require('../app/api/portal/meus-dados/route')
  const pai = { id: 'pai-1', role: 'pai' }

  preparar({ usuario: pai, respostas: {} })
  res = await meusDados(requisicao('PATCH', { endereco: 'Rua C', cidade: 'X', cep: CEP_7_DIGITOS }))
  assert.equal(res.status, 400)
  assert.equal((await res.json()).error, MENSAGEM_7)
  assert.equal(registros.length, 0, 'meus-dados: CEP inválido não grava nem o resto do endereço')

  preparar({ usuario: pai, respostas: {} })
  res = await meusDados(requisicao('PATCH', { nome: '', cep: CEP_7_DIGITOS }))
  assert.equal(res.status, 400)
  assert.match((await res.json()).error, /Nome não pode estar vazio\..*CEP incompleto/, 'os dois erros juntos, sem esconder um deles')

  preparar({ usuario: pai, respostas: {} })
  res = await meusDados(requisicao('PATCH', { endereco: ' Rua C ', cep: '38742-240' }))
  assert.equal(res.status, 200)
  assert.equal(gravacoesEmDetalhes()[0].payload.cep, '38742240')
  assert.equal(gravacoesEmDetalhes()[0].payload.endereco, 'Rua C')

  preparar({ usuario: pai, respostas: {} })
  res = await meusDados(requisicao('PATCH', { cep: '' }))
  assert.equal(res.status, 200, 'a família pode apagar o CEP')
  assert.equal(gravacoesEmDetalhes()[0].payload.cep, null)

  preparar({ usuario: pai, respostas: {} })
  res = await meusDados(requisicao('PATCH', { endereco: 'Só a rua' })) // CEP ausente: não mexe nele
  assert.equal(res.status, 200)
  assert.equal('cep' in gravacoesEmDetalhes()[0].payload, false)

  // ── action salvarDadosClinica (CEP da clínica) ────────────────────────────
  const { salvarDadosClinica } = require('../app/(admin)/admin/configuracoes/actions')
  const formulario = (cep: string) => {
    const fd = new FormData()
    fd.set('nome_fantasia', 'Alicerce')
    fd.set('cep', cep)
    return fd
  }

  preparar({ usuario: admin, respostas: {} })
  let resultado = await salvarDadosClinica(formulario(CEP_7_DIGITOS))
  assert.deepEqual(resultado, { erro: MENSAGEM_7 })
  assert.equal(registros.length, 0)

  preparar({ usuario: admin, respostas: {} })
  resultado = await salvarDadosClinica(formulario('38400-000'))
  assert.deepEqual(resultado, {})
  assert.equal(registros[0].payload.cep, '38400000')

  preparar({ usuario: admin, respostas: {} })
  resultado = await salvarDadosClinica(formulario(''))
  assert.deepEqual(resultado, {})
  assert.equal(registros[0].payload.cep, null)

  console.log('Rotas de CEP: testes passaram')
}

main().catch(erro => {
  console.error(erro)
  process.exit(1)
})
