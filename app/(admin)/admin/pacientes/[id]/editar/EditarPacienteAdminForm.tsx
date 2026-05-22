'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { TimePickerInput } from '@/components/ui/TimePickerInput'
import { mascaraCpf } from '@/lib/masks'

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
  horariosPorTerapeuta: Record<string, Horario[]>
  podeVincularTerapeutas: boolean
}

const labelStyle = { color: 'var(--color-ink-mid)' }

function HorariosSection({
  horarios,
  onChange,
}: {
  horarios: Horario[]
  onChange: (h: Horario[]) => void
}) {
  function add() { onChange([...horarios, { dia: 'segunda', hora: '' }]) }
  function remove(i: number) { onChange(horarios.filter((_, idx) => idx !== i)) }
  function update(i: number, field: keyof Horario, value: string) {
    if (field === 'hora') {
      const digits = value.replace(/\D/g, '').slice(0, 4)
      const formatted = digits.length > 2 ? `${digits.slice(0, 2)}:${digits.slice(2)}` : digits
      onChange(horarios.map((h, idx) => idx === i ? { ...h, hora: formatted } : h))
      return
    }
    onChange(horarios.map((h, idx) => idx === i ? { ...h, [field]: value } : h))
  }

  return (
    <div className="mt-2 pl-6 pb-2 space-y-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium" style={{ color: 'var(--color-ink-soft)' }}>Horários de atendimento</span>
        <button
          type="button"
          onClick={add}
          className="text-xs font-medium transition-opacity hover:opacity-70"
          style={{ color: 'var(--color-rose-main)' }}
        >
          + Adicionar
        </button>
      </div>
      {horarios.map((h, i) => (
        <div key={i} className="flex items-center gap-2">
          <select
            value={h.dia}
            onChange={e => update(i, 'dia', e.target.value)}
            className="input-base flex-1"
          >
            {dias.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
          </select>
          <TimePickerInput
            value={h.hora}
            onChange={val => update(i, 'hora', val)}
          />
          {horarios.length > 1 && (
            <button
              type="button"
              onClick={() => remove(i)}
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
  )
}

export function EditarPacienteAdminForm({
  paciente,
  todosTerapeutas,
  terapeutasIniciais,
  horariosPorTerapeuta,
  podeVincularTerapeutas,
}: Props) {
  const router = useRouter()
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  const [form, setForm] = useState({
    nome:                    paciente.nome ?? '',
    data_nascimento:         paciente.data_nascimento ?? '',
    sexo:                    paciente.sexo ?? '',
    cpf:                     mascaraCpf(paciente.cpf ?? ''),
    turno_preferencia:       paciente.turno_preferencia ?? '',
    convenio_ou_particular:  paciente.convenio_ou_particular ?? '',
  })

  const [terapeutasSel, setTerapeutasSel] = useState<string[]>(terapeutasIniciais)
  const [horariosPerTerapeuta, setHorariosPerTerapeuta] = useState<Record<string, Horario[]>>(() => {
    const initial: Record<string, Horario[]> = {}
    for (const id of terapeutasIniciais) {
      initial[id] = horariosPorTerapeuta[id]?.length > 0
        ? horariosPorTerapeuta[id]
        : [{ dia: 'segunda', hora: '' }]
    }
    return initial
  })

  function handle(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  function toggleTerapeuta(id: string) {
    setTerapeutasSel(prev => {
      if (prev.includes(id)) return prev.filter(t => t !== id)
      setHorariosPerTerapeuta(h => ({
        ...h,
        [id]: horariosPorTerapeuta[id]?.length > 0
          ? horariosPorTerapeuta[id]
          : [{ dia: 'segunda', hora: '' }],
      }))
      return [...prev, id]
    })
  }

  function setHorariosForTerapeuta(id: string, horarios: Horario[]) {
    setHorariosPerTerapeuta(prev => ({ ...prev, [id]: horarios }))
  }

  async function handleSalvar() {
    setErro('')
    const pattern = /^\d{2}:\d{2}$/

    const terapeutasPayload = terapeutasSel.map(id => {
      const horarios = (horariosPerTerapeuta[id] ?? []).filter(h => h.hora.trim())
      if (horarios.some(h => !pattern.test(h.hora))) return null
      return { id, horarios_atendimento: horarios }
    })

    if (terapeutasPayload.some(t => t === null)) {
      setErro('Formato de hora inválido. Use HH:MM.')
      return
    }

    setSalvando(true)
    const res = await fetch(`/api/paciente/${paciente.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nome:                   form.nome,
        data_nascimento:        form.data_nascimento || null,
        sexo:                   form.sexo || null,
        cpf:                    form.cpf,
        turno_preferencia:      form.turno_preferencia || null,
        convenio_ou_particular: form.convenio_ou_particular || null,
        ...(podeVincularTerapeutas ? { terapeutas: terapeutasPayload } : {}),
      }),
    })

    setSalvando(false)
    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      setErro(json.error ?? 'Erro ao salvar.')
      return
    }
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
            <input
              name="cpf"
              value={form.cpf}
              onChange={e => setForm(prev => ({ ...prev, cpf: mascaraCpf(e.target.value) }))}
              placeholder="000.000.000-00"
              inputMode="numeric"
              maxLength={14}
              className="input-base"
            />
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

          {podeVincularTerapeutas && (
            <div>
              <label className="block text-sm font-medium mb-2" style={labelStyle}>Profissionais</label>
              <div className="space-y-1">
                {todosTerapeutas.map(t => {
                  const selecionado = terapeutasSel.includes(t.id)
                  return (
                    <div key={t.id}>
                      <label className="flex items-center gap-2.5 cursor-pointer py-1">
                        <input
                          type="checkbox"
                          checked={selecionado}
                          onChange={() => toggleTerapeuta(t.id)}
                          className="w-4 h-4 flex-shrink-0"
                          style={{ accentColor: 'var(--color-rose-main)' }}
                        />
                        <span className="text-sm font-medium" style={{ color: 'var(--color-ink-mid)' }}>{t.nome}</span>
                      </label>
                      {selecionado && (
                        <HorariosSection
                          horarios={horariosPerTerapeuta[t.id] ?? [{ dia: 'segunda', hora: '' }]}
                          onChange={h => setHorariosForTerapeuta(t.id, h)}
                        />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

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
