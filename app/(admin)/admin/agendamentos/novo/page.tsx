'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

interface Perfil { id: string; nome: string }
interface Paciente { id: string; nome: string; codigo_interno: string | null }
interface Feriado { data: string; descricao: string }

const tipos = [
  { value: 'sessao',      label: 'Sessão terapêutica' },
  { value: 'devolutiva',  label: 'Devolutiva' },
  { value: 'reuniao',     label: 'Reunião' },
  { value: 'outro',       label: 'Outro' },
]

export default function NovoAgendamentoPage() {
  const router = useRouter()
  const [terapeutas, setTerapeutas] = useState<Perfil[]>([])
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [feriados, setFeriados] = useState<Feriado[]>([])
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')
  const [feriadoAviso, setFeriadoAviso] = useState<string | null>(null)
  const [modalFeriado, setModalFeriado] = useState(false)

  const [form, setForm] = useState({
    terapeuta_id: '',
    paciente_id: '',
    tipo: 'sessao',
    titulo: '',
    motivo: '',
    data: '',
    hora: '',
    duracao_minutos: '50',
    visivel_responsavel: true,
  })

  useEffect(() => {
    const supabase = createClient()
    Promise.all([
      supabase.from('profiles').select('id, nome').eq('role', 'terapeuta').order('nome'),
      supabase.from('pacientes').select('id, nome, codigo_interno').eq('status', 'ativo').order('nome'),
      supabase.from('feriados').select('data, descricao').order('data'),
    ]).then(([{ data: ts }, { data: ps }, { data: fs }]) => {
      setTerapeutas(ts ?? [])
      setPacientes(ps ?? [])
      setFeriados(fs ?? [])
    })
  }, [])

  function handle(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value, type } = e.target
    if (type === 'checkbox') {
      setForm(prev => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }))
    } else {
      if (name === 'data' && value) {
        const feriado = feriados.find(f => f.data === value)
        if (feriado) {
          setFeriadoAviso(feriado.descricao)
          setModalFeriado(true)
        } else {
          setFeriadoAviso(null)
        }
      }
      setForm(prev => ({ ...prev, [name]: value }))
    }
  }

  async function salvar() {
    setErro('')
    if (!form.terapeuta_id) { setErro('Selecione a terapeuta.'); return }
    if (!form.titulo.trim()) { setErro('Informe um título.'); return }
    if (!form.data || !form.hora) { setErro('Informe data e hora.'); return }

    const data_hora = new Date(`${form.data}T${form.hora}:00`).toISOString()
    setCarregando(true)
    const supabase = createClient()
    const { data: user } = await supabase.auth.getUser()
    const { error } = await supabase.from('agendamentos').insert({
      terapeuta_id: form.terapeuta_id,
      paciente_id: form.paciente_id || null,
      tipo: form.tipo,
      titulo: form.titulo.trim(),
      motivo: form.motivo.trim() || null,
      data_hora,
      duracao_minutos: parseInt(form.duracao_minutos) || 50,
      visivel_responsavel: form.visivel_responsavel,
      criado_por: user.user!.id,
    })
    setCarregando(false)
    if (error) { setErro('Erro ao salvar agendamento.'); return }
    router.push('/admin/agendamentos')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (feriadoAviso) {
      setModalFeriado(true)
    } else {
      await salvar()
    }
  }

  const labelStyle = { color: 'var(--color-ink-mid)' }
  const asterisk = <span style={{ color: 'var(--color-rose-main)' }}>*</span>

  return (
    <div className="space-y-6 max-w-xl">
      <div className="flex items-center gap-3">
        <a href="/admin/agendamentos" className="text-sm transition-colors hover:opacity-70" style={{ color: 'var(--color-ink-soft)' }}>
          ← Voltar
        </a>
        <h1 className="text-2xl font-semibold" style={{ fontFamily: 'var(--font-lora)', color: 'var(--color-ink)' }}>
          Novo agendamento
        </h1>
      </div>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-5">

          <div>
            <label className="block text-sm font-medium mb-1.5" style={labelStyle}>Terapeuta {asterisk}</label>
            <select name="terapeuta_id" value={form.terapeuta_id} onChange={handle} required className="input-base">
              <option value="">Selecione a terapeuta</option>
              {terapeutas.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5" style={labelStyle}>
              Paciente{' '}<span style={{ color: 'var(--color-ink-faint)', fontWeight: 400 }}>(opcional)</span>
            </label>
            <select name="paciente_id" value={form.paciente_id} onChange={handle} className="input-base">
              <option value="">Sem paciente / evento geral</option>
              {pacientes.map(p => (
                <option key={p.id} value={p.id}>
                  {p.codigo_interno ? `#${p.codigo_interno} ` : ''}{p.nome}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5" style={labelStyle}>Tipo</label>
            <select name="tipo" value={form.tipo} onChange={handle} className="input-base">
              {tipos.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5" style={labelStyle}>Título {asterisk}</label>
            <input name="titulo" value={form.titulo} onChange={handle} placeholder="Ex: Sessão de TO, Devolutiva semestral..." className="input-base" />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5" style={labelStyle}>
              Motivo / observação interna{' '}
              <span style={{ color: 'var(--color-ink-faint)', fontWeight: 400 }}>(visível à terapeuta)</span>
            </label>
            <textarea name="motivo" value={form.motivo} onChange={handle} rows={2} placeholder="Informações úteis para a terapeuta sobre este agendamento" className="input-base resize-none" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={labelStyle}>Data {asterisk}</label>
              <input type="date" name="data" value={form.data} onChange={handle} required className="input-base" />
              {feriadoAviso && (
                <p className="text-xs mt-1 font-medium" style={{ color: '#92400E' }}>
                  ⚠ Feriado: {feriadoAviso}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={labelStyle}>Hora {asterisk}</label>
              <input type="time" name="hora" value={form.hora} onChange={handle} required className="input-base" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5" style={labelStyle}>Duração (minutos)</label>
            <input type="number" name="duracao_minutos" value={form.duracao_minutos} onChange={handle} min="15" max="480" step="5" className="input-base w-32" />
          </div>

          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              name="visivel_responsavel"
              checked={form.visivel_responsavel}
              onChange={handle}
              className="w-4 h-4"
              style={{ accentColor: 'var(--color-rose-main)' }}
            />
            <span className="text-sm" style={{ color: 'var(--color-ink-mid)' }}>Visível para o responsável no portal</span>
          </label>

          {erro && <p className="text-sm" style={{ color: '#B91C1C' }}>{erro}</p>}

          <div className="flex gap-3 pt-1">
            <Button type="submit" disabled={carregando}>
              {carregando ? 'Salvando...' : 'Salvar agendamento'}
            </Button>
            <Button type="button" variant="ghost" onClick={() => router.push('/admin/agendamentos')}>
              Cancelar
            </Button>
          </div>
        </form>
      </Card>

      {/* Modal: aviso de feriado */}
      {modalFeriado && feriadoAviso && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 p-4"
          style={{ background: 'rgba(44,32,24,0.4)' }}
        >
          <div
            className="rounded-2xl p-5 max-w-sm w-full space-y-4"
            style={{ background: 'var(--color-warm-white)', boxShadow: '0 20px 60px rgba(44,32,24,0.2)' }}
          >
            <h3 className="font-semibold" style={{ color: '#92400E' }}>⚠ Atenção — Feriado na data selecionada</h3>
            <p className="text-sm" style={{ color: 'var(--color-ink-mid)' }}>
              Existe um feriado cadastrado nesta data: <strong>{feriadoAviso}</strong>.<br />
              Deseja confirmar o agendamento mesmo assim?
            </p>
            <div className="flex gap-3 pt-1">
              <button
                onClick={async () => { setModalFeriado(false); await salvar() }}
                disabled={carregando}
                className="flex-1 text-sm font-medium px-4 py-2 rounded-xl text-white transition-all disabled:opacity-50"
                style={{ background: 'var(--color-rose-main)' }}
              >
                {carregando ? 'Salvando...' : 'Confirmar agendamento'}
              </button>
              <button
                onClick={() => setModalFeriado(false)}
                className="text-sm px-4 py-2 rounded-xl transition-opacity hover:opacity-70"
                style={{ color: 'var(--color-ink-soft)' }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
