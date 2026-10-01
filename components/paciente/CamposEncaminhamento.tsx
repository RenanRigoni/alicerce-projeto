'use client'

import { useEffect, useId, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatarTelefone, somenteDigitosTelefone } from '@/lib/telefone'
import { CampoTelefone } from '@/components/ui/CampoTelefone'
import {
  LIMITES, UFS,
  escaparLike, formatarCrm, mascaraCrm, sugestoesDeMedicos,
  type FormEncaminhamento, type SugestaoMedico,
} from '@/lib/paciente/encaminhamentos'

interface Props {
  form: FormEncaminhamento
  onChange: (parcial: Partial<FormEncaminhamento>) => void
  /** Abre "Mais detalhes" já no início (edição de um registro que tem algum deles). */
  detalhesAbertos?: boolean
}

const rotulo = { color: 'var(--color-ink-mid)' }
const opcional = <span className="font-normal" style={{ color: 'var(--color-ink-faint)' }}> (opcional)</span>

/** Nome, CRM e telefone do médico em primeiro plano; o resto fica em "Mais detalhes". */
export function CamposEncaminhamento({ form, onChange, detalhesAbertos = false }: Props) {
  const id = useId()
  const [sugestoes, setSugestoes] = useState<SugestaoMedico[]>([])

  const termo = form.medico_nome.trim()
  useEffect(() => {
    if (termo.length < 2) return
    let cancelado = false
    const espera = setTimeout(async () => {
      // Sugestão é conveniência: se a consulta falhar, o campo segue livre.
      const { data } = await createClient()
        .from('encaminhamentos')
        .select('medico_nome, medico_crm, medico_crm_uf, medico_telefone, especialidade')
        .ilike('medico_nome', `%${escaparLike(termo)}%`)
        .order('criado_em', { ascending: false })
        .limit(40)
      if (!cancelado) setSugestoes(sugestoesDeMedicos(data ?? [], 5))
    }, 250)
    return () => { cancelado = true; clearTimeout(espera) }
  }, [termo])
  const sugestoesVisiveis = termo.length >= 2 ? sugestoes : []

  function usarSugestao(s: SugestaoMedico) {
    onChange({
      medico_nome: s.medico_nome ?? '',
      medico_crm: s.medico_crm ?? '',
      medico_crm_uf: s.medico_crm_uf ?? '',
      medico_telefone: somenteDigitosTelefone(s.medico_telefone),
      especialidade: s.especialidade ?? '',
    })
    setSugestoes([])
  }

  return (
    <div className="space-y-4">
      <p className="text-xs" style={{ color: 'var(--color-ink-faint)' }}>
        Preencha o que tiver. Nenhum campo é obrigatório, mas informe ao menos um: nome, CRM ou telefone do médico.
      </p>

      <div>
        <label htmlFor={`${id}-nome`} className="block text-sm font-medium mb-1.5" style={rotulo}>
          Nome do médico{opcional}
        </label>
        <input
          id={`${id}-nome`}
          value={form.medico_nome}
          onChange={e => onChange({ medico_nome: e.target.value })}
          maxLength={LIMITES.medico_nome}
          autoComplete="off"
          placeholder="Nome completo do médico que encaminhou"
          className="input-base"
        />
        {sugestoesVisiveis.length > 0 && (
          <div className="mt-2 space-y-1" role="group" aria-label="Médicos já registrados">
            <div className="text-xs" style={{ color: 'var(--color-ink-faint)' }}>
              Já registrado — toque para usar a mesma grafia:
            </div>
            <div className="flex flex-wrap gap-2">
              {sugestoesVisiveis.map(s => {
                const crm = formatarCrm(s.medico_crm, s.medico_crm_uf)
                const detalhe = [crm && `CRM ${crm}`, s.medico_telefone && formatarTelefone(s.medico_telefone), s.especialidade]
                  .filter(Boolean).join(' · ')
                return (
                  <button
                    key={s.medico_nome}
                    type="button"
                    onClick={() => usarSugestao(s)}
                    className="text-xs px-3 py-1.5 rounded-xl text-left transition-opacity hover:opacity-80"
                    style={{ border: '1px solid var(--color-rose-soft)', color: 'var(--color-rose-deep)', background: 'transparent' }}
                  >
                    <span className="font-medium">{s.medico_nome}</span>
                    {detalhe && <span style={{ color: 'var(--color-ink-soft)' }}> — {detalhe}</span>}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        <div className="col-span-2">
          <label htmlFor={`${id}-crm`} className="block text-sm font-medium mb-1.5" style={rotulo}>
            CRM{opcional}
          </label>
          <input
            id={`${id}-crm`}
            value={form.medico_crm}
            onChange={e => onChange({ medico_crm: mascaraCrm(e.target.value) })}
            inputMode="numeric"
            placeholder="Somente números"
            className="input-base"
          />
        </div>
        <div>
          <label htmlFor={`${id}-uf`} className="block text-sm font-medium mb-1.5" style={rotulo}>UF</label>
          <select
            id={`${id}-uf`}
            value={form.medico_crm_uf}
            onChange={e => onChange({ medico_crm_uf: e.target.value })}
            className="input-base"
          >
            <option value="">—</option>
            {UFS.map(uf => <option key={uf} value={uf}>{uf}</option>)}
          </select>
        </div>
        <div className="col-span-3">
          <label htmlFor={`${id}-tel`} className="block text-sm font-medium mb-1.5" style={rotulo}>
            Telefone do médico{opcional}
          </label>
          <CampoTelefone
            id={`${id}-tel`}
            value={form.medico_telefone}
            onChange={medico_telefone => onChange({ medico_telefone })}
            aceitaSemDdd
          />
        </div>
      </div>

      <details open={detalhesAbertos} className="group">
        <summary
          className="text-sm font-medium cursor-pointer select-none"
          style={{ color: 'var(--color-rose-main)' }}
        >
          Mais detalhes
          <span className="font-normal" style={{ color: 'var(--color-ink-faint)' }}> — especialidade, data, motivo e observações</span>
        </summary>
        <div className="space-y-4 mt-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor={`${id}-esp`} className="block text-sm font-medium mb-1.5" style={rotulo}>Especialidade</label>
              <input
                id={`${id}-esp`}
                value={form.especialidade}
                onChange={e => onChange({ especialidade: e.target.value })}
                maxLength={LIMITES.especialidade}
                placeholder="Ex.: Neuropediatria"
                className="input-base"
              />
            </div>
            <div>
              <label htmlFor={`${id}-data`} className="block text-sm font-medium mb-1.5" style={rotulo}>Data do encaminhamento</label>
              <input
                id={`${id}-data`}
                type="date"
                value={form.data_encaminhamento}
                onChange={e => onChange({ data_encaminhamento: e.target.value })}
                className="input-base"
              />
            </div>
          </div>

          <div>
            <label htmlFor={`${id}-motivo`} className="block text-sm font-medium mb-1.5" style={rotulo}>Motivo</label>
            <textarea
              id={`${id}-motivo`}
              value={form.motivo}
              onChange={e => onChange({ motivo: e.target.value })}
              maxLength={LIMITES.motivo}
              rows={2}
              className="input-base resize-y"
            />
          </div>

          <div>
            <label htmlFor={`${id}-obs`} className="block text-sm font-medium mb-1.5" style={rotulo}>Observações</label>
            <textarea
              id={`${id}-obs`}
              value={form.observacoes}
              onChange={e => onChange({ observacoes: e.target.value })}
              maxLength={LIMITES.observacoes}
              rows={2}
              className="input-base resize-y"
            />
          </div>
        </div>
      </details>
    </div>
  )
}
