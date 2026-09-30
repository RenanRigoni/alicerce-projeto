'use client'

import { useEffect, useId, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import {
  FORM_VAZIO, LIMITES, UFS,
  escaparLike, formDoEncaminhamento, formatarCrm, mascaraCrm, sugestoesDeMedicos, validarEncaminhamento,
  type DadosEncaminhamento, type Encaminhamento, type FormEncaminhamento, type SugestaoMedico,
} from '@/lib/paciente/encaminhamentos'

interface Props {
  pacienteId: string
  encaminhamentos: Encaminhamento[]
  /** admin/recepção e a terapeuta vinculada. Quem não vê recebe o aviso, não uma lista vazia. */
  podeVer: boolean
  /** só admin e recepção criam e editam (RLS idem). */
  podeGerenciar: boolean
  /** paciente com alta/desativado: o prontuário é de guarda, só leitura. */
  prontuarioEncerrado: boolean
}

const MENSAGEM_RECUSADO =
  'Não foi possível salvar. Se o paciente tem alta ou está desativado, o prontuário encerrado só pode ser consultado.'

const rotulo = { color: 'var(--color-ink-mid)' }

function dataBr(iso: string | null): string | null {
  return iso ? new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR') : null
}

function FormularioEncaminhamento({ inicial, rotuloSalvar, salvando, erro, onSalvar, onCancelar }: {
  inicial: FormEncaminhamento
  rotuloSalvar: string
  salvando: boolean
  erro: string
  onSalvar: (form: FormEncaminhamento) => void
  onCancelar: () => void
}) {
  const id = useId()
  const [form, setForm] = useState<FormEncaminhamento>(inicial)
  const [sugestoes, setSugestoes] = useState<SugestaoMedico[]>([])

  const termo = form.medico_nome.trim()
  useEffect(() => {
    if (termo.length < 2) return
    let cancelado = false
    const espera = setTimeout(async () => {
      // Sugestão é conveniência: se a consulta falhar, o campo segue livre.
      const { data } = await createClient()
        .from('encaminhamentos')
        .select('medico_nome, medico_crm, medico_crm_uf, especialidade')
        .ilike('medico_nome', `%${escaparLike(termo)}%`)
        .order('criado_em', { ascending: false })
        .limit(40)
      if (!cancelado) setSugestoes(sugestoesDeMedicos(data ?? [], 5))
    }, 250)
    return () => { cancelado = true; clearTimeout(espera) }
  }, [termo])
  const sugestoesVisiveis = termo.length >= 2 ? sugestoes : []

  function mudar(campo: keyof FormEncaminhamento, valor: string) {
    setForm(prev => ({ ...prev, [campo]: valor }))
  }

  function usarSugestao(s: SugestaoMedico) {
    setForm(prev => ({
      ...prev,
      medico_nome: s.medico_nome,
      medico_crm: s.medico_crm ?? '',
      medico_crm_uf: s.medico_crm_uf ?? '',
      especialidade: s.especialidade ?? '',
    }))
    setSugestoes([])
  }

  return (
    <Card>
      <div className="space-y-4">
        <div>
          <label htmlFor={`${id}-nome`} className="block text-sm font-medium mb-1.5" style={rotulo}>
            Médico <span style={{ color: 'var(--color-rose-main)' }}>*</span>
          </label>
          <input
            id={`${id}-nome`}
            value={form.medico_nome}
            onChange={e => mudar('medico_nome', e.target.value)}
            maxLength={LIMITES.medico_nome}
            autoComplete="off"
            placeholder="Nome do médico que encaminhou"
            className="input-base"
          />
          {sugestoesVisiveis.length > 0 && (
            <div className="mt-2 space-y-1" role="group" aria-label="Médicos já registrados">
              <div className="text-xs" style={{ color: 'var(--color-ink-faint)' }}>
                Já registrado — toque para usar a mesma grafia:
              </div>
              <div className="flex flex-wrap gap-2">
                {sugestoesVisiveis.map(s => {
                  const detalhe = [formatarCrm(s.medico_crm, s.medico_crm_uf) && `CRM ${formatarCrm(s.medico_crm, s.medico_crm_uf)}`, s.especialidade]
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

        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <label htmlFor={`${id}-crm`} className="block text-sm font-medium mb-1.5" style={rotulo}>
              CRM <span className="font-normal" style={{ color: 'var(--color-ink-faint)' }}>(opcional)</span>
            </label>
            <input
              id={`${id}-crm`}
              value={form.medico_crm}
              onChange={e => mudar('medico_crm', mascaraCrm(e.target.value))}
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
              onChange={e => mudar('medico_crm_uf', e.target.value)}
              className="input-base"
            >
              <option value="">—</option>
              {UFS.map(uf => <option key={uf} value={uf}>{uf}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor={`${id}-esp`} className="block text-sm font-medium mb-1.5" style={rotulo}>Especialidade</label>
            <input
              id={`${id}-esp`}
              value={form.especialidade}
              onChange={e => mudar('especialidade', e.target.value)}
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
              onChange={e => mudar('data_encaminhamento', e.target.value)}
              className="input-base"
            />
          </div>
        </div>

        <div>
          <label htmlFor={`${id}-motivo`} className="block text-sm font-medium mb-1.5" style={rotulo}>Motivo</label>
          <textarea
            id={`${id}-motivo`}
            value={form.motivo}
            onChange={e => mudar('motivo', e.target.value)}
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
            onChange={e => mudar('observacoes', e.target.value)}
            maxLength={LIMITES.observacoes}
            rows={2}
            className="input-base resize-y"
          />
        </div>

        {erro && <p role="alert" className="text-sm" style={{ color: '#B91C1C' }}>{erro}</p>}

        <div className="flex gap-3">
          <Button onClick={() => onSalvar(form)} disabled={salvando}>
            {salvando ? 'Salvando...' : rotuloSalvar}
          </Button>
          <Button variant="ghost" onClick={onCancelar} disabled={salvando}>Cancelar</Button>
        </div>
      </div>
    </Card>
  )
}

export function BlocoEncaminhamentos({ pacienteId, encaminhamentos, podeVer, podeGerenciar, prontuarioEncerrado }: Props) {
  const router = useRouter()
  const [criando, setCriando] = useState(false)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  const podeEscrever = podeGerenciar && !prontuarioEncerrado

  function fechar() {
    setCriando(false)
    setEditandoId(null)
    setErro('')
  }

  async function salvar(form: FormEncaminhamento, editando: Encaminhamento | null) {
    const validacao = validarEncaminhamento(form)
    if (!validacao.valido) { setErro(validacao.erro); return }

    setErro('')
    setSalvando(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSalvando(false); setErro('Sessão expirada. Entre novamente.'); return }

    const dados: DadosEncaminhamento = validacao.dados
    // A RLS recusa o INSERT com erro, mas o UPDATE bloqueado afeta 0 linhas SEM erro:
    // por isso o select() e a conferência do que voltou.
    const resposta = editando
      ? await supabase.from('encaminhamentos').update(dados).eq('id', editando.id).select('id')
      : await supabase.from('encaminhamentos')
          .insert({ paciente_id: pacienteId, ...dados, registrado_por: user.id })
          .select('id')
    setSalvando(false)

    if (resposta.error || !resposta.data?.length) {
      const recusadoPelaRls = resposta.error?.code === '42501' || (!resposta.error && !resposta.data?.length)
      setErro(recusadoPelaRls ? MENSAGEM_RECUSADO : 'Erro ao salvar. Tente novamente.')
      return
    }

    fechar()
    router.refresh()
  }

  return (
    <section className="space-y-3" aria-labelledby="titulo-encaminhamentos">
      <div className="flex items-center justify-between gap-3">
        <h3
          id="titulo-encaminhamentos"
          className="text-xs font-semibold uppercase tracking-wide"
          style={{ color: 'var(--color-ink-soft)' }}
        >
          Encaminhamentos
        </h3>
        {podeEscrever && !criando && editandoId === null && (
          <button
            type="button"
            onClick={() => setCriando(true)}
            className="text-sm font-medium px-4 py-1.5 rounded-xl transition-all duration-200"
            style={{ color: 'var(--color-rose-main)', border: '1px solid var(--color-rose-soft)', background: 'transparent' }}
          >
            Novo encaminhamento
          </button>
        )}
      </div>

      {!podeVer ? (
        <Card>
          <p className="text-sm" style={{ color: 'var(--color-ink-faint)' }}>
            Os encaminhamentos aparecem apenas para a recepção e para a terapeuta vinculada ao paciente.
          </p>
        </Card>
      ) : (
        <>
          {prontuarioEncerrado && (
            <p className="text-xs" style={{ color: 'var(--color-ink-faint)' }}>
              Prontuário encerrado: os encaminhamentos ficam disponíveis só para consulta.
            </p>
          )}

          {criando && (
            <FormularioEncaminhamento
              inicial={FORM_VAZIO}
              rotuloSalvar="Salvar encaminhamento"
              salvando={salvando}
              erro={erro}
              onSalvar={form => salvar(form, null)}
              onCancelar={fechar}
            />
          )}

          {encaminhamentos.length === 0 && !criando ? (
            <Card>
              <p className="text-sm" style={{ color: 'var(--color-ink-faint)' }}>
                {podeEscrever
                  ? 'Nenhum encaminhamento registrado. Use "Novo encaminhamento" para registrar o médico que encaminhou.'
                  : 'Nenhum encaminhamento registrado.'}
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {encaminhamentos.map(e => {
                if (editandoId === e.id) {
                  return (
                    <FormularioEncaminhamento
                      key={e.id}
                      inicial={formDoEncaminhamento(e)}
                      rotuloSalvar="Salvar alterações"
                      salvando={salvando}
                      erro={erro}
                      onSalvar={form => salvar(form, e)}
                      onCancelar={fechar}
                    />
                  )
                }
                const crm = formatarCrm(e.medico_crm, e.medico_crm_uf)
                const data = dataBr(e.data_encaminhamento)
                return (
                  <Card key={e.id}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold" style={{ color: 'var(--color-ink)' }}>{e.medico_nome}</div>
                        <div className="text-xs mt-0.5" style={{ color: 'var(--color-ink-soft)' }}>
                          {crm ? `CRM ${crm}` : <span style={{ color: 'var(--color-ink-faint)' }}>CRM não informado</span>}
                          {e.especialidade && ` · ${e.especialidade}`}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-xs" style={{ color: 'var(--color-ink-soft)' }}>{data ?? 'Sem data'}</div>
                        {podeEscrever && !criando && editandoId === null && (
                          <button
                            type="button"
                            onClick={() => { setErro(''); setEditandoId(e.id) }}
                            className="text-xs mt-1 transition-opacity hover:opacity-70"
                            style={{ color: 'var(--color-rose-main)' }}
                          >
                            Editar
                          </button>
                        )}
                      </div>
                    </div>
                    {e.motivo && (
                      <div className="mt-3">
                        <div className="text-xs mb-0.5" style={{ color: 'var(--color-ink-faint)' }}>Motivo</div>
                        <div className="text-sm whitespace-pre-wrap" style={{ color: 'var(--color-ink)' }}>{e.motivo}</div>
                      </div>
                    )}
                    {e.observacoes && (
                      <div className="mt-3">
                        <div className="text-xs mb-0.5" style={{ color: 'var(--color-ink-faint)' }}>Observações</div>
                        <div className="text-sm whitespace-pre-wrap" style={{ color: 'var(--color-ink)' }}>{e.observacoes}</div>
                      </div>
                    )}
                  </Card>
                )
              })}
            </div>
          )}
        </>
      )}
    </section>
  )
}
