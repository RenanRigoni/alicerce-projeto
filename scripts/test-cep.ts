import assert from 'node:assert/strict'
import { mascaraCep, normalizarCep, validarCep } from '../lib/endereco/cep'
import { avisoDeValidacao, avisoDoResultado } from '../lib/endereco/aviso-cep'
import { buscarCep } from '../lib/endereco/via-cep'

async function main() {
  // ── validação ─────────────────────────────────────────────────────────────
  // vazio é válido: CEP é opcional (94 dos 105 responsáveis não têm)
  for (const vazio of ['', '   ', null, undefined]) {
    assert.deepEqual(validarCep(vazio), { valido: true, cep: null })
  }

  // 8 dígitos, com e sem hífen, viram o mesmo valor gravado
  assert.deepEqual(validarCep('38742240'), { valido: true, cep: '38742240' })
  assert.deepEqual(validarCep('38742-240'), { valido: true, cep: '38742240' })
  assert.deepEqual(validarCep(' 38.742-240 '), { valido: true, cep: '38742240' })

  // 7 dígitos: o valor real "38742-24" que existe no banco, e sem hífen
  for (const sete of ['38742-24', '3874224']) {
    const r = validarCep(sete)
    assert.equal(r.valido, false)
    if (!r.valido) {
      assert.equal(r.motivo, 'incompleto')
      assert.equal(r.mensagem, 'CEP incompleto — faltam 1 dígito.')
    }
  }
  const tres = validarCep('38742')
  assert.equal(tres.valido === false && tres.mensagem, 'CEP incompleto — faltam 3 dígitos.')

  // 9 dígitos, com e sem hífen
  for (const nove of ['38742-2401', '387422401']) {
    const r = validarCep(nove)
    assert.equal(r.valido, false)
    if (!r.valido) {
      assert.equal(r.motivo, 'excedente')
      assert.equal(r.mensagem, 'CEP com 1 dígito a mais — o CEP tem 8 números.')
    }
  }

  // texto sem nenhum dígito não passa por "vazio"
  const letras = validarCep('abc')
  assert.equal(letras.valido === false && letras.motivo, 'sem_digitos')

  // normalização: o que é gravado
  assert.equal(normalizarCep('38551-152'), '38551152')
  assert.equal(normalizarCep('38170000'), '38170000')
  assert.equal(normalizarCep(''), null)
  assert.equal(normalizarCep('38742-24'), null)

  // ── máscara: não pode esconder o erro cortando em 8 ───────────────────────
  assert.equal(mascaraCep('38742240'), '38742-240')
  assert.equal(mascaraCep('387'), '387')
  assert.equal(mascaraCep('38742'), '38742')
  assert.equal(mascaraCep('387422401'), '38742-2401') // 9 dígitos continuam visíveis
  assert.equal(validarCep(mascaraCep('387422401')).valido, false)

  // ── mensagens da tela ─────────────────────────────────────────────────────
  assert.deepEqual(avisoDeValidacao('38742-24'), { tipo: 'erro', mensagem: 'CEP incompleto — faltam 1 dígito.' })
  assert.equal(avisoDeValidacao(''), null)
  assert.equal(avisoDeValidacao('38742-240'), null)

  // ── buscarCep: os três desfechos que antes viravam "null" ────────────────
  const fetchOriginal = globalThis.fetch
  const chamadas: string[] = []
  const simular = (resposta: () => Promise<Response>) => {
    globalThis.fetch = (async (url: string | URL | Request) => {
      chamadas.push(String(url))
      return resposta()
    }) as typeof fetch
  }
  const json = (corpo: unknown, status = 200) =>
    Promise.resolve(new Response(JSON.stringify(corpo), { status, headers: { 'Content-Type': 'application/json' } }))

  try {
    // incompleto: nem chega a consultar
    const incompleto = await buscarCep('38742-24')
    assert.deepEqual(incompleto, { ok: false, motivo: 'incompleto' })
    assert.equal(chamadas.length, 0)

    // encontrado
    simular(() => json({ logradouro: 'Rua A', bairro: 'Centro', localidade: 'Uberlândia', uf: 'MG' }))
    assert.deepEqual(await buscarCep('38400-000'), {
      ok: true,
      endereco: { logradouro: 'Rua A', bairro: 'Centro', localidade: 'Uberlândia', uf: 'MG' },
    })
    assert.equal(chamadas.at(-1), 'https://viacep.com.br/ws/38400000/json/')

    // CEP de 8 dígitos que o ViaCEP não conhece
    simular(() => json({ erro: 'true' }))
    assert.deepEqual(await buscarCep('99999-999'), { ok: false, motivo: 'nao_encontrado' })

    // ViaCEP fora do ar: rede, HTTP 5xx e resposta que não é JSON
    simular(() => Promise.reject(new TypeError('fetch failed')))
    assert.deepEqual(await buscarCep('38400000'), { ok: false, motivo: 'falha_consulta' })
    simular(() => json({}, 503))
    assert.deepEqual(await buscarCep('38400000'), { ok: false, motivo: 'falha_consulta' })
    simular(() => Promise.resolve(new Response('<html>manutenção</html>', { status: 200 })))
    assert.deepEqual(await buscarCep('38400000'), { ok: false, motivo: 'falha_consulta' })

    // e cada desfecho vira a mensagem certa: só o incompleto é erro; os outros deixam salvar
    assert.equal(avisoDoResultado({ ok: true, endereco: { logradouro: '', localidade: '', bairro: '', uf: '' } }), null)
    assert.equal(avisoDoResultado({ ok: false, motivo: 'nao_encontrado' })?.tipo, 'aviso')
    assert.equal(avisoDoResultado({ ok: false, motivo: 'falha_consulta' })?.tipo, 'aviso')
    assert.equal(avisoDoResultado({ ok: false, motivo: 'incompleto' })?.tipo, 'erro')
    assert.notEqual(
      avisoDoResultado({ ok: false, motivo: 'nao_encontrado' })?.mensagem,
      avisoDoResultado({ ok: false, motivo: 'falha_consulta' })?.mensagem,
    )
  } finally {
    globalThis.fetch = fetchOriginal
  }

  console.log('CEP: testes passaram')
}

main().catch(erro => {
  console.error(erro)
  process.exit(1)
})
