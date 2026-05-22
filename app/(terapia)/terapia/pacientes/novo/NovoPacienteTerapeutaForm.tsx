'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { TimePickerInput } from '@/components/ui/TimePickerInput'

interface Horario {
  dia: string
  hora: string
}

const dias = [
  { value: 'segunda', label: 'Segunda-feira' },
  { value: 'terca', label: 'Terça-feira' },
  { value: 'quarta', label: 'Quarta-feira' },
  { value: 'quinta', label: 'Quinta-feira' },
  { value: 'sexta', label: 'Sexta-feira' },
  { value: 'sabado', label: 'Sábado' },
]

export function NovoPacienteTerapeutaForm() {
  const router = useRouter()
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')
  const [horarios, setHorarios] = useState<Horario[]>([{ dia: 'segunda', hora: '' }])
  const [form, setForm] = useState({
    nome: '',
    data_nascimento: '',
    sexo: '',
    cpf: '',
    turno_preferencia: '',
    convenio_ou_particular: '',
  })

  function handle(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  function addHorario() {
    setHorarios(prev => [...prev, { dia: 'segunda', hora: '' }])
  }

  function removeHorario(i: number) {
    setHorarios(prev => prev.filter((_, idx) => idx !== i))
  }

  function updateHorario(i: number, field: keyof Horario, value: string) {
    if (field === 'hora') {
      const digits = value.replace(/\D/g, '').slice(0, 4)
      const formatted = digits.length > 2 ? `${digits.slice(0, 2)}:${digits.slice(2)}` : digits
      setHorarios(prev => prev.map((h, idx) => idx === i ? { ...h, hora: formatted } : h))
      return
    }
    setHorarios(prev => prev.map((h, idx) => idx === i ? { ...h, [field]: value } : h))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro('')

    const pattern = /^\d{2}:\d{2}$/
    const horariosValidos = horarios.filter(h => h.hora.trim())
    if (horariosValidos.some(h => !pattern.test(h.hora))) {
      setErro('Formato de hora inválido. Use HH:MM (ex: 13:10).')
      return
    }

    setCarregando(true)
    const res = await fetch('/api/paciente', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nome: form.nome,
        data_nascimento: form.data_nascimento || null,
        sexo: form.sexo || null,
        cpf: form.cpf.trim() || null,
        frequencia_atendimento: horariosValidos.length > 0 ? `${horariosValidos.length}x por semana` : null,
        turno_preferencia: form.turno_preferencia || null,
        convenio_ou_particular: form.convenio_ou_particular || null,
        horarios_atendimento: horariosValidos,
      }),
    })

    const json = await res.json().catch(() => ({}))
    setCarregando(false)

    if (!res.ok) {
      setErro(json.error ?? 'Erro ao cadastrar paciente.')
      return
    }

    router.push(`/terapia/paciente/${json.paciente_id}`)
  }

  const labelStyle = { color: 'var(--color-ink-mid)' }

  return (
    <div className="space-y-6 max-w-xl">
      <div className="flex items-center gap-3">
        <Link
          href="/terapia/pacientes"
          className="text-sm transition-colors hover:opacity-70"
          style={{ color: 'var(--color-ink-soft)' }}
        >
          &larr; Voltar
        </Link>
        <h1
          className="text-2xl font-semibold"
          style={{ fontFamily: 'var(--font-lora)', color: 'var(--color-ink)' }}
        >
          Novo paciente
        </h1>
      </div>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium mb-1.5" style={labelStyle}>
              Nome completo <span style={{ color: 'var(--color-rose-main)' }}>*</span>
            </label>
            <input
              name="nome"
              value={form.nome}
              onChange={handle}
              required
              placeholder="Nome do paciente"
              className="input-base"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={labelStyle}>
                Data de nascimento
              </label>
              <input
                type="date"
                name="data_nascimento"
                value={form.data_nascimento}
                onChange={handle}
                className="input-base"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={labelStyle}>
                Sexo
              </label>
              <select name="sexo" value={form.sexo} onChange={handle} className="input-base">
                <option value="">Não informado</option>
                <option value="masculino">Masculino</option>
                <option value="feminino">Feminino</option>
                <option value="outro">Outro</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5" style={labelStyle}>
              CPF ou documento
            </label>
            <input
              name="cpf"
              value={form.cpf}
              onChange={handle}
              placeholder="000.000.000-00"
              className="input-base"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={labelStyle}>
                Tipo de atendimento
              </label>
              <select name="convenio_ou_particular" value={form.convenio_ou_particular} onChange={handle} className="input-base">
                <option value="">Não definido</option>
                <option value="particular">Particular</option>
                <option value="convenio">Convênio</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={labelStyle}>
                Turno preferencial
              </label>
              <select name="turno_preferencia" value={form.turno_preferencia} onChange={handle} className="input-base">
                <option value="">Não definido</option>
                <option value="manha">Manhã</option>
                <option value="tarde">Tarde</option>
                <option value="qualquer">Qualquer</option>
              </select>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium" style={labelStyle}>
                Horários de atendimento
              </label>
              <button
                type="button"
                onClick={addHorario}
                className="text-xs font-medium transition-opacity hover:opacity-70"
                style={{ color: 'var(--color-sage-main)' }}
              >
                + Adicionar horário
              </button>
            </div>
            <div className="space-y-2">
              {horarios.map((h, i) => (
                <div key={i} className="flex items-center gap-2">
                  <select
                    value={h.dia}
                    onChange={e => updateHorario(i, 'dia', e.target.value)}
                    className="input-base flex-1"
                  >
                    {dias.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                  </select>
                  <TimePickerInput
                    value={h.hora}
                    onChange={val => updateHorario(i, 'hora', val)}
                  />
                  {horarios.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeHorario(i)}
                      className="text-lg leading-none px-1 transition-colors"
                      style={{ color: 'var(--color-ink-faint)' }}
                    >
                      x
                    </button>
                  )}
                </div>
              ))}
            </div>
            <p className="text-xs mt-1.5" style={{ color: 'var(--color-ink-faint)' }}>
              Use o formato HH:MM (ex: 09:00, 13:30).
            </p>
          </div>

          {erro && <p className="text-sm" style={{ color: '#B91C1C' }}>{erro}</p>}

          <div className="flex gap-3 pt-1">
            <Button type="submit" disabled={carregando}>
              {carregando ? 'Salvando...' : 'Cadastrar paciente'}
            </Button>
            <Button type="button" variant="ghost" onClick={() => router.push('/terapia/pacientes')}>
              Cancelar
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
