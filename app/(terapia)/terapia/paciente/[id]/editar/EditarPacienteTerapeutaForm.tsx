'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { TimePickerInput } from '@/components/ui/TimePickerInput'

interface Horario { dia: string; hora: string }

const dias = [
  { value: 'segunda', label: 'Segunda-feira' },
  { value: 'terca',   label: 'Terça-feira' },
  { value: 'quarta',  label: 'Quarta-feira' },
  { value: 'quinta',  label: 'Quinta-feira' },
  { value: 'sexta',   label: 'Sexta-feira' },
  { value: 'sabado',  label: 'Sábado' },
]

const labelStyle = { color: 'var(--color-ink-mid)' }

export function EditarPacienteTerapeutaForm({ paciente }: { paciente: any }) {
  const router = useRouter()
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  const [form, setForm] = useState({
    nome:                   paciente.nome ?? '',
    data_nascimento:        paciente.data_nascimento ?? '',
    sexo:                   paciente.sexo ?? '',
    frequencia_atendimento: paciente.frequencia_atendimento ?? '',
    turno_preferencia:      paciente.turno_preferencia ?? '',
  })

  const [horarios, setHorarios] = useState<Horario[]>(
    paciente.horarios_atendimento?.length > 0
      ? paciente.horarios_atendimento
      : [{ dia: 'segunda', hora: '' }]
  )

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
    if (!form.nome.trim()) { setErro('Nome é obrigatório.'); return }
    setErro('')
    const pattern = /^\d{2}:\d{2}$/
    const horariosValidos = horarios.filter(h => h.hora.trim())
    if (horariosValidos.some(h => !pattern.test(h.hora))) {
      setErro('Formato de hora inválido. Use HH:MM.')
      return
    }

    setSalvando(true)
    const res = await fetch(`/api/terapeuta/paciente/${paciente.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nome: form.nome.trim(),
        data_nascimento: form.data_nascimento || null,
        sexo: form.sexo || null,
        frequencia_atendimento: form.frequencia_atendimento || null,
        turno_preferencia: form.turno_preferencia || null,
        horarios_atendimento: horariosValidos,
      }),
    })

    setSalvando(false)
    if (!res.ok) { const j = await res.json(); setErro(j.error ?? 'Erro ao salvar.'); return }
    router.push(`/terapia/paciente/${paciente.id}`)
  }

  return (
    <div className="space-y-6 max-w-xl">
      <div className="flex items-center gap-3">
        <a href={`/terapia/paciente/${paciente.id}`} className="text-sm transition-colors hover:opacity-70" style={{ color: 'var(--color-ink-soft)' }}>
          ← Voltar
        </a>
        <h1 className="text-2xl font-semibold" style={{ fontFamily: 'var(--font-lora)', color: 'var(--color-ink)' }}>
          Editar — {paciente.nome}
        </h1>
      </div>

      <Card>
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium mb-1.5" style={labelStyle}>
              Nome completo <span style={{ color: 'var(--color-rose-main)' }}>*</span>
            </label>
            <input value={form.nome} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))} className="input-base" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={labelStyle}>Data de nascimento</label>
              <input type="date" value={form.data_nascimento} onChange={e => setForm(p => ({ ...p, data_nascimento: e.target.value }))} className="input-base" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={labelStyle}>Sexo</label>
              <select value={form.sexo} onChange={e => setForm(p => ({ ...p, sexo: e.target.value }))} className="input-base">
                <option value="">—</option>
                <option value="masculino">Masculino</option>
                <option value="feminino">Feminino</option>
                <option value="outro">Outro</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={labelStyle}>Frequência</label>
              <input value={form.frequencia_atendimento} onChange={e => setForm(p => ({ ...p, frequencia_atendimento: e.target.value }))} placeholder="Ex: 2x por semana" className="input-base" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={labelStyle}>Turno preferencial</label>
              <select value={form.turno_preferencia} onChange={e => setForm(p => ({ ...p, turno_preferencia: e.target.value }))} className="input-base">
                <option value="">—</option>
                <option value="manha">Manhã</option>
                <option value="tarde">Tarde</option>
                <option value="qualquer">Qualquer</option>
              </select>
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--color-border-soft)', paddingTop: '1rem' }}>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium" style={labelStyle}>Horários de atendimento</label>
              <button type="button" onClick={addHorario} className="text-xs font-medium transition-opacity hover:opacity-70" style={{ color: 'var(--color-rose-main)' }}>
                + Adicionar
              </button>
            </div>
            <div className="space-y-2">
              {horarios.map((h, i) => (
                <div key={i} className="flex items-center gap-2">
                  <select value={h.dia} onChange={e => updateHorario(i, 'dia', e.target.value)} className="input-base flex-1">
                    {dias.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                  </select>
                  <TimePickerInput
                    value={h.hora}
                    onChange={val => updateHorario(i, 'hora', val)}
                  />
                  {horarios.length > 1 && (
                    <button type="button" onClick={() => removeHorario(i)} className="text-lg leading-none px-1 transition-colors" style={{ color: 'var(--color-border)' }}
                      onMouseOver={e => (e.currentTarget.style.color = '#EF4444')}
                      onMouseOut={e => (e.currentTarget.style.color = 'var(--color-border)')}>
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
            <Button variant="ghost" onClick={() => router.push(`/terapia/paciente/${paciente.id}`)}>
              Cancelar
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
