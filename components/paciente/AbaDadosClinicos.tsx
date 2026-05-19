'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { gerarHash } from '@/lib/hash/gerar-hash'
import type { DadosClinicos } from './PerfilPacienteTabs'

interface Props {
  pacienteId: string
  dadosIniciais: DadosClinicos | null
  podeEditar: boolean
}

type Form = Omit<DadosClinicos, 'atualizado_em'>

const camposClinicos: Array<{ key: keyof Form; label: string; tipo?: 'date' | 'textarea' }> = [
  { key: 'hipotese_diagnostica',        label: 'Hipótese diagnóstica' },
  { key: 'diagnostico',                 label: 'Diagnóstico confirmado' },
  { key: 'data_avaliacao_inicial',      label: 'Data da avaliação inicial', tipo: 'date' },
  { key: 'objetivos_terapeuticos',      label: 'Objetivos terapêuticos', tipo: 'textarea' },
  { key: 'plano_terapeutico',           label: 'Plano terapêutico', tipo: 'textarea' },
  { key: 'demandas_prioritarias',       label: 'Demandas prioritárias', tipo: 'textarea' },
  { key: 'obs_clinicas_gerais',         label: 'Observações clínicas gerais', tipo: 'textarea' },
  { key: 'estrategias_utilizadas',      label: 'Estratégias utilizadas', tipo: 'textarea' },
  { key: 'orientacoes_para_casa',       label: 'Orientações para casa', tipo: 'textarea' },
  { key: 'evolucao_resumida',           label: 'Evolução resumida', tipo: 'textarea' },
  { key: 'metas_curto_prazo',           label: 'Metas de curto prazo', tipo: 'textarea' },
  { key: 'metas_medio_prazo',           label: 'Metas de médio prazo', tipo: 'textarea' },
  { key: 'sensibilidades_restricoes',   label: 'Sensibilidades e restrições', tipo: 'textarea' },
  { key: 'nivel_suporte',               label: 'Nível de suporte necessário' },
  { key: 'obs_comportamento_regulacao', label: 'Comportamento e regulação', tipo: 'textarea' },
  { key: 'informacoes_escolares',       label: 'Informações escolares relevantes', tipo: 'textarea' },
  { key: 'pontos_atencao_equipe',       label: 'Pontos de atenção para a equipe', tipo: 'textarea' },
]

const SECOES_EDIT: Array<{ titulo: string; keys: (keyof Form)[] }> = [
  { titulo: 'Diagnóstico', keys: ['hipotese_diagnostica', 'diagnostico', 'data_avaliacao_inicial'] },
  { titulo: 'Planejamento', keys: ['objetivos_terapeuticos', 'plano_terapeutico', 'demandas_prioritarias', 'metas_curto_prazo', 'metas_medio_prazo'] },
  { titulo: 'Acompanhamento', keys: ['obs_clinicas_gerais', 'estrategias_utilizadas', 'orientacoes_para_casa', 'evolucao_resumida'] },
  { titulo: 'Dados complementares', keys: ['sensibilidades_restricoes', 'nivel_suporte', 'obs_comportamento_regulacao', 'informacoes_escolares', 'pontos_atencao_equipe'] },
]

function formFromDados(d: DadosClinicos | null): Form {
  const empty: Form = {
    hipotese_diagnostica: null, diagnostico: null, objetivos_terapeuticos: null,
    plano_terapeutico: null, demandas_prioritarias: null, data_avaliacao_inicial: null,
    obs_clinicas_gerais: null, estrategias_utilizadas: null, orientacoes_para_casa: null,
    evolucao_resumida: null, metas_curto_prazo: null, metas_medio_prazo: null,
    sensibilidades_restricoes: null, nivel_suporte: null, obs_comportamento_regulacao: null,
    informacoes_escolares: null, pontos_atencao_equipe: null,
  }
  if (!d) return empty
  return {
    hipotese_diagnostica:        d.hipotese_diagnostica,
    diagnostico:                 d.diagnostico,
    objetivos_terapeuticos:      d.objetivos_terapeuticos,
    plano_terapeutico:           d.plano_terapeutico,
    demandas_prioritarias:       d.demandas_prioritarias,
    data_avaliacao_inicial:      d.data_avaliacao_inicial,
    obs_clinicas_gerais:         d.obs_clinicas_gerais,
    estrategias_utilizadas:      d.estrategias_utilizadas,
    orientacoes_para_casa:       d.orientacoes_para_casa,
    evolucao_resumida:           d.evolucao_resumida,
    metas_curto_prazo:           d.metas_curto_prazo,
    metas_medio_prazo:           d.metas_medio_prazo,
    sensibilidades_restricoes:   d.sensibilidades_restricoes,
    nivel_suporte:               d.nivel_suporte,
    obs_comportamento_regulacao: d.obs_comportamento_regulacao,
    informacoes_escolares:       d.informacoes_escolares,
    pontos_atencao_equipe:       d.pontos_atencao_equipe,
  }
}

function SecaoClinicos({ titulo, keys, form, camposMap }: {
  titulo: string
  keys: (keyof Form)[]
  form: Form
  camposMap: Map<keyof Form, string>
}) {
  const campos = keys.filter(k => form[k])
  if (campos.length === 0) return null
  return (
    <Card>
      <h4
        className="text-xs font-semibold uppercase tracking-wide mb-3"
        style={{ color: 'var(--color-ink-soft)' }}
      >
        {titulo}
      </h4>
      <div className="space-y-3">
        {campos.map(key => (
          <div key={String(key)}>
            <div
              className="text-xs mb-0.5"
              style={{ color: 'var(--color-ink-faint)' }}
            >
              {camposMap.get(key)}
            </div>
            <div
              className="text-sm whitespace-pre-wrap"
              style={{ color: 'var(--color-ink)' }}
            >
              {key === 'data_avaliacao_inicial' && form[key]
                ? new Date(form[key]! + 'T12:00:00').toLocaleDateString('pt-BR')
                : form[key]}
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}

export function AbaDadosClinicos({ pacienteId, dadosIniciais, podeEditar }: Props) {
  const [editando, setEditando] = useState(false)
  const [form, setForm] = useState<Form>(formFromDados(dadosIniciais))
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [atualizadoEm, setAtualizadoEm] = useState(dadosIniciais?.atualizado_em ?? null)

  const camposMap = new Map(camposClinicos.map(c => [c.key, c.label]))

  function handleChange(key: keyof Form, value: string) {
    setForm(prev => ({ ...prev, [key]: value || null }))
  }

  async function handleSalvar() {
    setErro('')
    setSalvando(true)
    const supabase = createClient()
    const agora = new Date().toISOString()
    const { data: user } = await supabase.auth.getUser()

    const hash = await gerarHash({
      paciente_id: pacienteId,
      editado_por: user.user?.id,
      ...form,
      editado_em: agora,
    })

    const payload = {
      ...form,
      atualizado_em: agora,
      atualizado_por: user.user?.id,
      hash_integridade: hash,
    }

    const { error } = await supabase
      .from('pacientes_dados_clinicos')
      .upsert({ paciente_id: pacienteId, ...payload }, { onConflict: 'paciente_id' })

    setSalvando(false)
    if (error) { setErro('Erro ao salvar. Tente novamente.'); return }

    setAtualizadoEm(agora)
    setEditando(false)
  }

  function handleCancelar() {
    setForm(formFromDados(dadosIniciais))
    setErro('')
    setEditando(false)
  }

  // Modo leitura
  if (!editando) {
    const temDados = camposClinicos.some(c => form[c.key])
    return (
      <div className="space-y-3">
        {podeEditar && (
          <div className="flex justify-end">
            <button
              onClick={() => setEditando(true)}
              className="text-sm font-medium px-4 py-1.5 rounded-xl transition-all duration-200"
              style={{
                color: 'var(--color-rose-main)',
                border: '1px solid var(--color-rose-soft)',
                background: 'transparent',
              }}
            >
              {temDados ? 'Editar dados clínicos' : 'Preencher dados clínicos'}
            </button>
          </div>
        )}

        {!temDados ? (
          <Card>
            <p className="text-sm" style={{ color: 'var(--color-ink-faint)' }}>
              {podeEditar
                ? 'Nenhum dado clínico preenchido ainda. Clique em "Preencher dados clínicos" para começar.'
                : 'Dados clínicos não preenchidos ainda.'}
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            <SecaoClinicos
              titulo="Diagnóstico"
              keys={['hipotese_diagnostica', 'diagnostico', 'data_avaliacao_inicial']}
              form={form}
              camposMap={camposMap}
            />
            <SecaoClinicos
              titulo="Planejamento"
              keys={['objetivos_terapeuticos', 'plano_terapeutico', 'demandas_prioritarias', 'metas_curto_prazo', 'metas_medio_prazo']}
              form={form}
              camposMap={camposMap}
            />
            <SecaoClinicos
              titulo="Acompanhamento"
              keys={['obs_clinicas_gerais', 'estrategias_utilizadas', 'orientacoes_para_casa', 'evolucao_resumida']}
              form={form}
              camposMap={camposMap}
            />
            <SecaoClinicos
              titulo="Dados complementares"
              keys={['sensibilidades_restricoes', 'nivel_suporte', 'obs_comportamento_regulacao', 'informacoes_escolares', 'pontos_atencao_equipe']}
              form={form}
              camposMap={camposMap}
            />

            {atualizadoEm && (
              <p className="text-xs text-right" style={{ color: 'var(--color-ink-faint)' }}>
                Última atualização: {new Date(atualizadoEm).toLocaleDateString('pt-BR')}
              </p>
            )}
          </div>
        )}
      </div>
    )
  }

  // Modo edição
  const camposInfoMap = new Map(camposClinicos.map(c => [c.key, c]))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold" style={{ color: 'var(--color-ink-mid)' }}>
          Editar dados clínicos
        </h3>
        <button
          onClick={handleCancelar}
          className="text-xs transition-opacity hover:opacity-70"
          style={{ color: 'var(--color-ink-soft)' }}
        >
          Cancelar
        </button>
      </div>

      {SECOES_EDIT.map(secao => (
        <Card key={secao.titulo}>
          <h4
            className="text-xs font-semibold uppercase tracking-wide mb-4"
            style={{ color: 'var(--color-ink-soft)' }}
          >
            {secao.titulo}
          </h4>
          <div className="space-y-4">
            {secao.keys.map(key => {
              const campo = camposInfoMap.get(key)!
              return (
                <div key={String(key)}>
                  <label
                    className="block text-sm font-medium mb-1.5"
                    style={{ color: 'var(--color-ink-mid)' }}
                  >
                    {campo.label}
                  </label>
                  {campo.tipo === 'textarea' ? (
                    <textarea
                      value={form[key] ?? ''}
                      onChange={e => handleChange(key, e.target.value)}
                      rows={3}
                      className="input-base resize-y"
                    />
                  ) : campo.tipo === 'date' ? (
                    <input
                      type="date"
                      value={form[key] ?? ''}
                      onChange={e => handleChange(key, e.target.value)}
                      className="input-base"
                    />
                  ) : (
                    <input
                      type="text"
                      value={form[key] ?? ''}
                      onChange={e => handleChange(key, e.target.value)}
                      className="input-base"
                    />
                  )}
                </div>
              )
            })}
          </div>
        </Card>
      ))}

      {erro && (
        <p className="text-sm" style={{ color: '#B91C1C' }}>{erro}</p>
      )}

      <div className="flex gap-3">
        <Button onClick={handleSalvar} disabled={salvando}>
          {salvando ? 'Salvando...' : 'Salvar dados clínicos'}
        </Button>
        <Button variant="ghost" onClick={handleCancelar}>Cancelar</Button>
      </div>
    </div>
  )
}
