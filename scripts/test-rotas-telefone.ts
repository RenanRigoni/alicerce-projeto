/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Exercita as rotas e as actions que gravam telefone com os handlers reais. Só o acesso ao
 * Supabase é substituído por um duplo que registra o que seria gravado (o mesmo duplo do
 * test:rotas-cep): assim dá para provar, sem sessão de usuário, que o servidor recusa
 * telefone de tamanho inválido ANTES de gravar qualquer coisa e que o valor gravado são
 * sempre só dígitos, sem corrigir nada (o 9 que falta não é prefixado).
 */
import assert from 'node:assert/strict'
import Module from 'node:module'
import { NextRequest } from 'next/server'

type Registro = { via: 'usuario' | 'admin'; op: 'update' | 'upsert' | 'insert'; table: string; payload: any }
type Cenario = {
  usuario: { id: string; role: string; permissoes?: Record<string, boolean> }
  /** `tabela` / `tabela?` = linha única; `tabela[]` = lista; `tabela*` = várias linhas que a consulta casaria. */
  respostas: Record<string, any>
}

let cenario: Cenario
let registros: Registro[] = []
let chamadasAuthAdmin: string[] = []

function construtor(via: Registro['via'], table: string) {
  let limitado = false
  const q: any = {
    select: () => q, eq: () => q, in: () => q, neq: () => q, order: () => q,
    limit: () => { limitado = true; return q },
    single: async () => ({ data: cenario.respostas[table] ?? null, error: null }),
    maybeSingle: async () => {
      const linhas: any[] | undefined = cenario.respostas[`${table}*`]
      if (linhas) {
        if (linhas.length > 1 && !limitado) {
          return { data: null, error: { code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned' } }
        }
        return { data: linhas[0] ?? null, error: null }
      }
      return { data: cenario.respostas[`${table}?`] ?? cenario.respostas[table] ?? null, error: null }
    },
    update: (payload: any) => { registros.push({ via, op: 'update', table, payload }); return q },
    insert: (payload: any) => { registros.push({ via, op: 'insert', table, payload }); return Promise.resolve({ error: null }) },
    upsert: (payload: any) => { registros.push({ via, op: 'upsert', table, payload }); return Promise.resolve({ error: null }) },
    then: (resolve: (v: any) => void) => resolve({ data: cenario.respostas[`${table}[]`] ?? [], error: null }),
  }
  return q
}

const clienteUsuario = () => {
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

const gravacoesEm = (tabela: string) => registros.filter(r => r.table === tabela)

// Tamanhos inválidos: incompleto, os 12 dígitos reais de profiles.telefone, 13 dígitos, sem dígito, lixo no JSON
const RUINS: unknown[] = ['349988', '(34) 993222-2908', '3499988225491', 'abc', { x: 1 }]
const SEM_NONO = '(34) 8812-6967' // celular no formato antigo: existe em produção e salva (a tela só avisa)
const CELULAR = '(34) 99999-9999'
const FIXO = '(34) 3333-4444'

async function main() {
  const admin = { id: 'admin-1', role: 'admin' }
  let res: Response

  // ── /api/admin/criar-usuario ──────────────────────────────────────────────
  const { POST: criarUsuario } = require('../app/api/admin/criar-usuario/route')
  const novoPai = (extra: Record<string, unknown>) => ({ role: 'pai', nome: 'Maria', email: 'maria@ex.com', ...extra })

  for (const ruim of RUINS) {
    for (const campo of ['telefone', 'contato_emergencia_telefone']) {
      preparar({ usuario: admin, respostas: {} })
      res = await criarUsuario(requisicao('POST', novoPai({ [campo]: ruim })))
      assert.equal(res.status, 400, `criar-usuario recusa ${campo} = ${JSON.stringify(ruim)}`)
      assert.match((await res.json()).error, /^Telefone /)
      assert.deepEqual(chamadasAuthAdmin, [], 'criar-usuario: telefone inválido não pode nem criar a conta no Auth')
      assert.equal(registros.length, 0)
    }
  }

  preparar({ usuario: admin, respostas: {} })
  res = await criarUsuario(requisicao('POST', novoPai({ telefone: CELULAR, contato_emergencia_nome: 'Ana', contato_emergencia_telefone: FIXO })))
  assert.equal(res.status, 200)
  assert.equal(gravacoesEm('profiles')[0].payload.telefone, '34999999999', 'profiles.telefone: só dígitos')
  assert.equal(gravacoesEm('responsaveis_detalhes')[0].payload.telefone_principal, '34999999999')
  assert.equal(gravacoesEm('responsaveis_detalhes')[0].payload.contato_emergencia_telefone, '3433334444')

  preparar({ usuario: admin, respostas: {} })
  res = await criarUsuario(requisicao('POST', novoPai({ telefone: SEM_NONO })))
  assert.equal(res.status, 200, 'celular sem o nono dígito já existe no banco: salva (a tela avisa)')
  assert.equal(gravacoesEm('profiles')[0].payload.telefone, '3488126967', 'NÃO prefixa o 9 sozinho')

  preparar({ usuario: admin, respostas: {} })
  res = await criarUsuario(requisicao('POST', novoPai({})))
  assert.equal(res.status, 200, 'telefone ausente continua valendo (é opcional)')
  assert.equal('telefone' in gravacoesEm('profiles')[0].payload, false)
  assert.equal(gravacoesEm('responsaveis_detalhes')[0].payload.telefone_principal, null)

  preparar({ usuario: admin, respostas: {} })
  res = await criarUsuario(requisicao('POST', novoPai({ telefone: '   ', contato_emergencia_telefone: '' })))
  assert.equal(res.status, 200, 'em branco também')

  // ── /api/usuario/[id] (edição pelo admin) ─────────────────────────────────
  const { PATCH: editarUsuario } = require('../app/api/usuario/[id]/route')
  const contexto = { params: Promise.resolve({ id: 'resp-1' }) }
  const editarPai = (detalhes: Record<string, unknown>, raiz: Record<string, unknown> = {}) => ({
    nome: 'Maria', email: 'maria@ex.com', ...raiz,
    detalhes_responsavel: { endereco: 'Rua A', numero: '1', complemento: '', cidade: 'X', cep: '', contato_emergencia: null, ...detalhes },
  })

  for (const ruim of RUINS) {
    preparar({ usuario: admin, respostas: { alvo: { role: 'pai' } } })
    res = await editarUsuario(requisicao('PATCH', editarPai({ telefone_principal: ruim })), contexto)
    assert.equal(res.status, 400, `usuario/[id] recusa telefone_principal = ${JSON.stringify(ruim)}`)
    assert.deepEqual(chamadasAuthAdmin, [], 'usuario/[id]: nada é gravado nem no Auth')
    assert.equal(registros.length, 0)
  }
  for (const ruim of ['Ana — 123', 'Ana — (34) 993222-2908', 'Ana — abc']) {
    preparar({ usuario: admin, respostas: { alvo: { role: 'pai' } } })
    res = await editarUsuario(requisicao('PATCH', editarPai({ contato_emergencia: ruim })), contexto)
    assert.equal(res.status, 400, `usuario/[id] recusa o telefone dentro de "${ruim}"`)
    assert.equal(registros.length, 0)
  }
  preparar({ usuario: admin, respostas: { alvo: { role: 'pai' } } })
  res = await editarUsuario(requisicao('PATCH', editarPai({ telefone_principal: CELULAR, contato_emergencia: 'Ana — (34) 3333-4444' })), contexto)
  assert.equal(res.status, 200)
  assert.equal(gravacoesEm('responsaveis_detalhes')[0].payload.telefone_principal, '34999999999', 'telefone_principal sai só com dígitos')
  assert.equal(gravacoesEm('responsaveis_detalhes')[0].payload.contato_emergencia, 'Ana — (34) 3333-4444', 'o texto do contato não é reescrito')

  preparar({ usuario: admin, respostas: { alvo: { role: 'pai' } } })
  res = await editarUsuario(requisicao('PATCH', editarPai({ contato_emergencia: 'Só o nome' })), contexto)
  assert.equal(res.status, 200, 'contato sem telefone vale')

  // O telefone do perfil de um responsável nunca é gravado por esta rota (a tela o esconde e manda o valor
  // antigo junto): um valor legado inválido ali não pode barrar a edição do resto.
  preparar({ usuario: admin, respostas: { alvo: { role: 'pai' } } })
  res = await editarUsuario(requisicao('PATCH', editarPai({}, { telefone: '(34) 993222-2908' })), contexto)
  assert.equal(res.status, 200)
  assert.equal('telefone' in gravacoesEm('profiles')[0].payload, false)

  for (const ruim of RUINS) {
    preparar({ usuario: admin, respostas: { alvo: { role: 'terapeuta' } } })
    res = await editarUsuario(requisicao('PATCH', { nome: 'Dra. Ana', email: 'ana@ex.com', telefone: ruim }), contexto)
    assert.equal(res.status, 400, `usuario/[id] recusa telefone de profissional = ${JSON.stringify(ruim)}`)
    assert.equal(registros.length, 0)
    assert.deepEqual(chamadasAuthAdmin, [])
  }
  preparar({ usuario: admin, respostas: { alvo: { role: 'terapeuta' } } })
  res = await editarUsuario(requisicao('PATCH', { nome: 'Dra. Ana', email: 'ana@ex.com', telefone: CELULAR }), contexto)
  assert.equal(res.status, 200)
  assert.equal(gravacoesEm('profiles')[0].payload.telefone, '34999999999')
  preparar({ usuario: admin, respostas: { alvo: { role: 'terapeuta' } } })
  res = await editarUsuario(requisicao('PATCH', { nome: 'Dra. Ana', email: 'ana@ex.com', telefone: '' }), contexto)
  assert.equal(res.status, 200)
  assert.equal(gravacoesEm('profiles')[0].payload.telefone, null, 'apagar o telefone vale')

  // ── /api/terapeuta/responsavel/[id] ───────────────────────────────────────
  const { PATCH: editarComoTerapeuta } = require('../app/api/terapeuta/responsavel/[id]/route')
  const terapeuta = { id: 'ter-1', role: 'terapeuta', permissoes: { gerenciar_responsaveis: true } }
  const respostasTerapeuta = {
    'paciente_terapeutas[]': [{ paciente_id: 'pac-1' }],
    paciente_responsaveis: { responsavel_id: 'resp-1' },
  }

  for (const ruim of RUINS) {
    preparar({ usuario: terapeuta, respostas: respostasTerapeuta })
    res = await editarComoTerapeuta(requisicao('PATCH', { nome: 'Maria', telefone_principal: ruim }), contexto)
    assert.equal(res.status, 400, `terapeuta/responsavel recusa telefone_principal = ${JSON.stringify(ruim)}`)
    assert.equal(registros.length, 0, 'nem o nome é gravado quando o telefone é inválido')
  }
  preparar({ usuario: terapeuta, respostas: respostasTerapeuta })
  res = await editarComoTerapeuta(requisicao('PATCH', { contato_emergencia: 'Ana — 123' }), contexto)
  assert.equal(res.status, 400)
  assert.equal(registros.length, 0)

  preparar({ usuario: terapeuta, respostas: respostasTerapeuta })
  res = await editarComoTerapeuta(requisicao('PATCH', { telefone_principal: CELULAR, contato_emergencia: 'Ana — (34) 3333-4444' }), contexto)
  assert.equal(res.status, 200)
  assert.equal(gravacoesEm('responsaveis_detalhes')[0].payload.telefone_principal, '34999999999')

  preparar({ usuario: terapeuta, respostas: respostasTerapeuta })
  res = await editarComoTerapeuta(requisicao('PATCH', { telefone_principal: '' }), contexto)
  assert.equal(res.status, 200)
  assert.equal(gravacoesEm('responsaveis_detalhes')[0].payload.telefone_principal, null, 'apagar vale')

  preparar({ usuario: terapeuta, respostas: respostasTerapeuta })
  res = await editarComoTerapeuta(requisicao('PATCH', { endereco: 'Rua B' }), contexto)
  assert.equal(res.status, 200)
  assert.equal('telefone_principal' in gravacoesEm('responsaveis_detalhes')[0].payload, false, 'campo ausente: não mexe')

  // ── /api/portal/meus-dados (a família edita os próprios dados) ────────────
  const { PATCH: meusDados } = require('../app/api/portal/meus-dados/route')
  const pai = { id: 'pai-1', role: 'pai' }

  for (const ruim of RUINS) {
    preparar({ usuario: pai, respostas: {} })
    res = await meusDados(requisicao('PATCH', { endereco: 'Rua C', telefone_principal: ruim }))
    assert.equal(res.status, 400, `meus-dados recusa telefone_principal = ${JSON.stringify(ruim)}`)
    assert.equal(registros.length, 0, 'não grava nem o resto')
  }
  preparar({ usuario: pai, respostas: {} })
  res = await meusDados(requisicao('PATCH', { contato_emergencia: 'Ana — 123' }))
  assert.equal(res.status, 400)
  assert.equal(registros.length, 0)

  preparar({ usuario: pai, respostas: {} })
  res = await meusDados(requisicao('PATCH', { nome: '', telefone_principal: '123' }))
  assert.equal(res.status, 400)
  assert.match((await res.json()).error, /Nome não pode estar vazio\..*Telefone incompleto/, 'os dois erros juntos, sem esconder um')

  preparar({ usuario: pai, respostas: {} })
  res = await meusDados(requisicao('PATCH', { telefone_principal: ` ${CELULAR} `, contato_emergencia: 'Ana — (34) 3333-4444' }))
  assert.equal(res.status, 200)
  assert.equal(gravacoesEm('responsaveis_detalhes')[0].payload.telefone_principal, '34999999999')

  preparar({ usuario: pai, respostas: {} })
  res = await meusDados(requisicao('PATCH', { telefone_principal: '' }))
  assert.equal(res.status, 200, 'a família pode apagar o telefone')
  assert.equal(gravacoesEm('responsaveis_detalhes')[0].payload.telefone_principal, null)

  // ── action salvarMeuPerfil (meu perfil) ───────────────────────────────────
  const { salvarMeuPerfil } = require('../lib/actions/perfil-actions')
  const formularioPerfil = (telefone: string) => {
    const fd = new FormData()
    fd.set('role', 'admin'); fd.set('nome', 'Admin'); fd.set('telefone', telefone)
    return fd
  }
  for (const ruim of ['349988', '(34) 993222-2908', '3499988225491', 'abc']) {
    preparar({ usuario: admin, respostas: {} })
    const resultado = await salvarMeuPerfil(formularioPerfil(ruim))
    assert.match(resultado.erro, /^Telefone /, `meu perfil recusa ${ruim}`)
    assert.equal(registros.length, 0)
  }
  preparar({ usuario: admin, respostas: {} })
  assert.deepEqual(await salvarMeuPerfil(formularioPerfil(CELULAR)), {})
  assert.equal(registros[0].payload.telefone, '34999999999')
  preparar({ usuario: admin, respostas: {} })
  assert.deepEqual(await salvarMeuPerfil(formularioPerfil('')), {})
  assert.equal(registros[0].payload.telefone, null)

  // ── action salvarDadosClinica (telefone da clínica) ───────────────────────
  const { salvarDadosClinica } = require('../app/(admin)/admin/configuracoes/actions')
  const formularioClinica = (telefone: string) => {
    const fd = new FormData()
    fd.set('nome_fantasia', 'Alicerce'); fd.set('cep', ''); fd.set('telefone', telefone)
    return fd
  }
  for (const ruim of ['349988', '(34) 993222-2908']) {
    preparar({ usuario: admin, respostas: {} })
    const resultado = await salvarDadosClinica(formularioClinica(ruim))
    assert.match(resultado.erro, /^Telefone /)
    assert.equal(registros.length, 0)
  }
  preparar({ usuario: admin, respostas: {} })
  assert.deepEqual(await salvarDadosClinica(formularioClinica('34992900583')), {})
  assert.equal(registros[0].payload.telefone, '34992900583')

  console.log('Rotas de telefone: testes passaram')
}

main().catch(erro => {
  console.error(erro)
  process.exit(1)
})
