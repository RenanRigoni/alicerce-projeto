'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

interface Horario { dia: string; hora: string }
const dias = [
  { value: 'segunda', label: 'Segunda-feira' },
  { value: 'terca',   label: 'Terça-feira' },
  { value: 'quarta',  label: 'Quarta-feira' },
  { value: 'quinta',  label: 'Quinta-feira' },
  { value: 'sexta',   label: 'Sexta-feira' },
  { value: 'sabado',  label: 'Sábado' },
]

interface Props {
  paciente: any
  todosTerapeutas: Array<{ id: string; nome: string }>
  terapeutasIniciais: string[]
}

const labelStyle = { color: 'var(--color-ink-mid)' }

export function EditarPacienteAdminForm({ paciente, todosTerapeutas, terapeutasIniciais }: Props) {
  const router = useRouter()
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  const [form, setForm] = useState({
    nome:                    paciente.nome ?? '',
    data_nascimento:         paciente.data_nascimento ?? '',
    sexo:                    paciente.sexo ?? '',
    cpf:                     paciente.cpf ?? '',
    frequencia_atendimento:  paciente.frequencia_atendimento ?? '',
    turno_preferencia:       paciente.turno_preferencia ?? '',
    convenio_ou_particular:  paciente.convenio_ou_particular ?? '',
  })

  const [terapeutasSel, setTerapeutasSel] = useState<string[]>(terapeutasIniciais)
  const [horarios, setHorarios] = useState<Horario[]>(
    paciente.horarios_atendimento?.length > 0
      ? paciente.horarios_atendimento
      : [{ dia: 'segunda', hora: '' }]
  )

  function handle(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  function toggleTerapeuta(id: string) {
    setTerapeutasSel(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id])
  }

  function addHorario() { setHorarios(prev => [...prev, { dia: 'segunda', hora: '' }]) }
  function removeHorario(i: number) { setHorarios(prev => prev.filter((_, idx) => idx !== i)) }
  function updateHorario(i: number, field: keyof Horario, value: string) {
    if (field === 'hora') {
      const digits = value.replace(/\D/g, '').slice(0, 4)
      const formatted = digits.length > 2 ? `${digits.slice(0, 2)}:${digits.slice(2)}` : digits
      setHorarios(prev => prev.map((h, idx) => idx === i ? { ...h, hora: formatted } : h))
      return
    }
    setHorarios(prev => prev.map((h, idx) => idx === i ? { ...h, [field]: value } : h))
  }

  async function handleSalvar() {
    setErro('')
    const pattern = /^\d{2}:\d{2}$/
    const horariosValidos = horarios.filter(h => h.hora.trim())
    if (horariosValidos.some(h => !pattern.test(h.hora))) {
      setErro('Formato de hora inválido. Use HH:MM.')
      return
    }

    setSalvando(true)
    const supabase = createClient()

    // CPF Phase 2: cifra antes de salvar (LGPD Art. 46)
    let cpfCifrado: string | null = null
    const cpfPlain = form.cpf.trim() || null
    if (cpfPlain) {
      const { data: enc } = await supabase.rpc('encrypt_cpf', { cpf_plain: cpfPlain })
      cpfCifrado = (enc as string | null) ?? null
    }

    const { error: erroPaciente } = await supabase
      .from('pacientes')
      .update({
        nome:                   form.nome,
        data_nascimento:        form.data_nascimento || null,
        sexo:                   form.sexo || null,
        cpf_cifrado:            cpfCifrado,
        frequencia_atendimento: form.frequencia_atendimento.trim() || null,
        turno_preferencia:      form.turno_preferencia || null,
        convenio_ou_particular: form.convenio_ou_particular || null,
        horarios_atendimento:   horariosValidos,
        atualizado_em:          new Date().toISOString(),
      })
      .eq('id', paciente.id)

    if (erroPaciente) { setErro('Erro ao salvar.'); setSalvando(false); return }

    await supabase.from('paciente_terapeutas').delete().eq('paciente_id', paciente.id)
    if (terapeutasSel.length > 0) {
      await supabase.from('paciente_terapeutas').insert(
        terapeutasSel.map(tid => ({ paciente_id: paciente.id, terapeuta_id: tid }))
      )
    }

    setSalvando(false)
    router.push(`/admin/pacientes/${paciente.id}`)
  }

  return (
    <div className="space-y-6 max-w-xl">
      <div className="flex items-center gap-3">
        <a
          href={`/admin/pacientes/${paciente.id}`}
          className="text-sm transition-colors hover:opacity-70"
          style={{ color: 'var(--color-ink-soft)' }}
        >
          ← Voltar
        </a>
        <h1
          className="text-2xl font-semibold"
          style={{ fontFamily: 'var(--font-lora)', color: 'var(--color-ink)' }}
        >
          Editar — {paciente.nome}
        </h1>
      </div>

      <Card>
        <div className="space-y-5">

          <div>
            <label className="block text-sm font-medium mb-1.5" style={labelStyle}>Nome completo</label>
            <input name="nome" value={form.nome} onChange={handle} className="input-base" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={labelStyle}>Data de nascimento</label>
              <input type="date" name="data_nascimento" value={form.data_nascimento} onChange={handle} className="input-base" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={labelStyle}>Sexo</label>
              <select name="sexo" value={form.sexo} onChange={handle} className="input-base">
                <option value="">Não informado</option>
                <option value="masculino">Masculino</option>
                <option value="feminino">Feminino</option>
                <option value="outro">Outro</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5" style={labelStyle}>CPF ou documento</label>
            <input name="cpf" value={form.cpf} onChange={handle} placeholder="000.000.000-00" className="input-base" />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5" style={labelStyle}>Frequência de atendimento</label>
            <input name="frequencia_atendimento" value={form.frequencia_atendimento} onChange={handle}
              placeholder="Ex: 2x por semana" className="input-base" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={labelStyle}>Tipo de atendimento</label>
              <select name="convenio_ou_particular" value={form.convenio_ou_particular} onChange={handle} className="input-base">
                <option value="">Não definido</option>
                <option value="particular">Particular</option>
                <option value="convenio">Convênio</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={labelStyle}>Turno preferencial</label>
              <select name="turno_preferencia" value={form.turno_preferencia} onChange={handle} className="input-base">
                <option value="">Não definido</option>
                <option value="manha">Manhã</option>
                <option value="tarde">Tarde</option>
                <option value="qualquer">Qualquer</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={labelStyle}>Profissionais</label>
            <div className="space-y-2">
              {todosTerapeutas.map(t => (
                <label key={t.id} className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={terapeutasSel.includes(t.id)}
                    onChange={() => toggleTerapeuta(t.id)}
                    className="w-4 h-4"
                    style={{ accentColor: 'var(--color-rose-main)' }}
                  />
                  <span className="text-sm" style={{ color: 'var(--color-ink-mid)' }}>{t.nome}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium" style={labelStyle}>Horários de atendimento</label>
              <button
                type="button"
                onClick={addHorario}
                className="text-xs font-medium transition-opacity hover:opacity-70"
                style={{ color: 'var(--color-rose-main)' }}
              >
                + Adicionar
              </button>
            </div>
            <div className="space-y-2">
              {horarios.map((h, i) => (
                <div key={i} className="flex items-center gap-2">
                  <select value={h.dia} onChange={e => updateHorario(i, 'dia', e.target.value)} className="input-base flex-1">
                    {dias.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                  </select>
                  <input
                    type="text"
                    value={h.hora}
                    onChange={e => updateHorario(i, 'hora', e.target.value)}
                    placeholder="13:10"
                    maxLength={5}
                    inputMode="numeric"
                    className="input-base w-24 text-center"
                  />
                  {horarios.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeHorario(i)}
                      className="text-lg leading-none px-1 transition-colors"
                      style={{ color: 'var(--color-border)' }}
                      onMouseOver={e => (e.currentTarget.style.color = '#EF4444')}
                      onMouseOut={e => (e.currentTarget.style.color = 'var(--color-border)')}
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {erro && <p className="text-sm" style={{ color: '#B91C1C' }}>{erro}</p>}

          <div className="flex gap-3 pt-1">
            <Button onClick={handleSalvar} disabled={salvando}>
              {salvando ? 'Salvando...' : 'Salvar alterações'}
            </Button>
            <Button variant="ghost" onClick={() => router.push(`/admin/pacientes/${paciente.id}`)}>
              Cancelar
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
