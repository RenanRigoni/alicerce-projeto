import assert from 'node:assert/strict'
import { mascaraCep, mascaraCepDoEvento, normalizarCep, validarCep } from '../lib/endereco/cep'
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
  assert.equal(mascaraCep('38742'), '38742-', 'o hífen é fixo: aparece com 5 dígitos')
  assert.equal(mascaraCep('3874'), '3874', 'com 4 dígitos ainda não há hífen')
  assert.equal(mascaraCep('387422401'), '38742-2401') // 9 dígitos continuam visíveis
  assert.equal(validarCep(mascaraCep('387422401')).valido, false)

  // hífen fixo: digitar o hífen ou não digitar dá no mesmo; campo sem dígitos continua vazio
  assert.equal(mascaraCep(''), '')
  assert.equal(mascaraCep('-'), '', 'só o hífen não vira nada (senão apareceria erro vermelho sem motivo)')
  assert.equal(mascaraCep('--'), '')
  assert.equal(mascaraCep('38742-'), '38742-', 'digitar o hífen depois do 5º dígito é idempotente')
  assert.equal(mascaraCep('38742--'), '38742-')
  assert.equal(mascaraCep(mascaraCep('38742')), '38742-', 'reaplicar não muda')
  assert.equal(mascaraCep('38742-2'), '38742-2')
  assert.equal(mascaraCep('38742240'), '38742-240', 'valor gravado (8 dígitos) semeia o campo com hífen')
  assert.equal(mascaraCep('38742-240'), '38742-240', 'valor antigo com hífen também')

  // apagar: não recolocar o hífen que a pessoa acabou de apagar (senão o 5º dígito nunca sai)
  assert.equal(mascaraCep('38742', { apagando: true }), '38742', 'hífen apagado de "38742-": continua apagado')
  assert.equal(mascaraCep('38742-', { apagando: true }), '38742-', 'apagou o 1º dígito depois do hífen: o hífen, que ainda está lá, fica')
  assert.equal(mascaraCep('3874', { apagando: true }), '3874')
  assert.equal(mascaraCep('38742-24', { apagando: true }), '38742-24')
  // digitando com o hífen já no campo, nada muda em relação ao padrão
  assert.equal(mascaraCep('38742', { apagando: false }), '38742-')
  // sequência completa de Backspace a partir de um CEP cheio, como o campo a veria
  let campo = mascaraCep('38742240')
  const esperado = ['38742-24', '38742-2', '38742-', '38742', '3874', '387', '38', '3', '']
  for (const passo of esperado) {
    campo = mascaraCep(campo.slice(0, -1), { apagando: true })
    assert.equal(campo, passo, `Backspace leva a "${passo}"`)
  }

  // o helper dos onChange lê o tipo do evento nativo
  const evento = (value: string, inputType?: string) => ({ target: { value }, nativeEvent: { inputType } as unknown as Event })
  assert.equal(mascaraCepDoEvento(evento('38742', 'insertText')), '38742-')
  assert.equal(mascaraCepDoEvento(evento('38742', 'deleteContentBackward')), '38742')
  assert.equal(mascaraCepDoEvento(evento('38742', 'deleteByCut')), '38742')
  assert.equal(mascaraCepDoEvento(evento('38742', 'deleteContentForward')), '38742')
  assert.equal(mascaraCepDoEvento(evento('38742', 'insertFromPaste')), '38742-', 'colar não é apagar')
  assert.equal(mascaraCepDoEvento(evento('38742')), '38742-', 'evento sem inputType: trata como digitação')
  assert.equal(mascaraCepDoEvento(evento('', 'deleteContentBackward')), '')

  // a validação e o aviso não se atrapalham com o hífen final (B5): "38742-" é "faltam 3 dígitos"
  assert.equal(validarCep('38742-').valido === false && (validarCep('38742-') as { mensagem: string }).mensagem, 'CEP incompleto — faltam 3 dígitos.')
  assert.deepEqual(avisoDeValidacao('38742-'), { tipo: 'erro', mensagem: 'CEP incompleto — faltam 3 dígitos.' })
  assert.equal(normalizarCep('38742-'), null)
  assert.equal(normalizarCep(mascaraCep('38742240')), '38742240', 'o que é gravado continua sendo 8 dígitos sem hífen')
  assert.equal(validarCep('-').valido === false && (validarCep('-') as { motivo: string }).motivo, 'sem_digitos', 'é por isso que o campo vazio não pode virar "-"')

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
    // com o hífen final que a máscara agora põe: continua "incompleto", sem consultar (B5)
    assert.deepEqual(await buscarCep('38742-'), { ok: false, motivo: 'incompleto' })
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
