'use client'

import { useCallback, useRef, useState } from 'react'
import { avisoDeValidacao, avisoDoResultado, type AvisoCep } from './aviso-cep'
import { somenteDigitosCep, validarCep } from './cep'
import { buscarCep, type EnderecoViaCep } from './via-cep'

interface Opcoes {
  /** CEP que o formulário já traz (edição). Só consulta o ViaCEP quando ele mudar. */
  cepInicial?: string | null
  onEndereco: (endereco: EnderecoViaCep) => void
}

/**
 * Comportamento único de CEP para todas as telas que o aceitam:
 * - ao sair do campo: avisa CEP incompleto/excedente na hora; com 8 dígitos, autopreenche;
 * - ViaCEP fora do ar ou CEP desconhecido só avisam; nunca impedem de salvar;
 * - `validarParaSalvar` bloqueia o envio quando há dígitos e não são exatamente 8.
 */
export function useCep({ cepInicial, onEndereco }: Opcoes) {
  // CEP inválido já gravado (como o de 7 dígitos que existe no banco) aparece de
  // cara, para a recepção enxergar e corrigir sem precisar clicar no campo.
  const [aviso, setAviso] = useState<AvisoCep | null>(() => avisoDeValidacao(cepInicial))
  const [buscando, setBuscando] = useState(false)
  const ultimoConsultado = useRef(somenteDigitosCep(cepInicial))
  const consultaAtual = useRef(0)

  // Digitar invalida a consulta em andamento: a resposta de um CEP antigo não pode
  // sobrescrever o endereço de um CEP novo.
  const aoDigitar = useCallback(() => {
    consultaAtual.current += 1
    setBuscando(false)
    setAviso(null)
  }, [])

  const aoSairDoCampo = useCallback(async (valor: string) => {
    const validacao = validarCep(valor)
    if (!validacao.valido) {
      setAviso({ tipo: 'erro', mensagem: validacao.mensagem })
      return
    }
    setAviso(null)

    // Vazio, ou CEP que não mudou: não refaz a consulta, para um simples foco/desfoco
    // não apagar o endereço que a pessoa já ajustou à mão.
    if (!validacao.cep || validacao.cep === ultimoConsultado.current) return

    ultimoConsultado.current = validacao.cep
    const minhaConsulta = ++consultaAtual.current
    setBuscando(true)
    const resultado = await buscarCep(validacao.cep)
    if (minhaConsulta !== consultaAtual.current) return

    setBuscando(false)
    if (resultado.ok) {
      onEndereco(resultado.endereco)
      return
    }
    ultimoConsultado.current = '' // permite tentar de novo no próximo desfoco
    setAviso(avisoDoResultado(resultado))
  }, [onEndereco])

  /** Devolve a mensagem de erro (e a mostra no campo) ou null quando pode salvar. */
  const validarParaSalvar = useCallback((valor: string): string | null => {
    const validacao = validarCep(valor)
    if (validacao.valido) return null
    setAviso({ tipo: 'erro', mensagem: validacao.mensagem })
    return validacao.mensagem
  }, [])

  return { aviso, buscando, aoDigitar, aoSairDoCampo, validarParaSalvar }
}
