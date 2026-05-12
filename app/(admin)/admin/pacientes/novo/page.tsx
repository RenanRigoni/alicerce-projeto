'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

interface Terapeuta { id: string; nome: string }
interface Responsavel { id: string; nome: string }
interface Horario { dia: string; hora: string }

const dias = [
  { value: 'segunda', label: 'Segunda-feira' },
  { value: 'terca',   label: 'Terça-feira' },
  { value: 'quarta',  label: 'Quarta-feira' },
  { value: 'quinta',  label: 'Quinta-feira' },
  { value: 'sexta',   label: 'Sexta-feira' },
  { value: 'sabado',  label: 'Sábado' },
]

function NovoPacienteForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const responsavelId = searchParams.get('responsavel_id')

  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')
  const [terapeutas, setTerapeutas] = useState<Terapeuta[]>([])
  const [responsaveis, setResponsaveis] = useState<Responsavel[]>([])
  const [terapeutasSelecionados, setTerapeutasSelecionados] = useState<string[]>([])
  const [responsavelSelecionado, setResponsavelSelecionado] = useState(responsavelId ?? '')
  const [horarios, setHorarios] = useState<Horario[]>([{ dia: 'segunda', hora: '' }])

  const [form, setForm] = useState({
    nome: '',
    data_nascimento: '',
    sexo: '',
    cpf: '',
    turno_preferencia: '',
    convenio_ou_particular: '',
  })

  useEffect(() => {
    const supabase = createClient()
    supabase.from('profiles').select('id, nome').eq('role', 'terapeuta').order('nome')
      .then(({ data }) => setTerapeutas(data ?? []))
    supabase.from('profiles').select('id, nome').eq('role', 'pai').order('nome')
      .then(({ data }) => setResponsaveis(data ?? []))
  }, [])

  function handle(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  function toggleTerapeuta(id: string) {
    setTerapeutasSelecionados(prev =>
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    )
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
        terapeutas: terapeutasSelecionados,
        responsavel_id: responsavelSelecionado || null,
      }),
    })

    const json = await res.json()
    setCarregando(false)

    if (!res.ok) {
      setErro(json.error ?? 'Erro ao cadastrar paciente.')
      return
    }

    router.push(responsavelId ? `/admin/usuarios/${responsavelId}` : `/admin/pacientes/${json.paciente_id}`)
  }

  const voltarUrl = responsavelId ? `/admin/usuarios/${responsavelId}` : '/admin/pacientes'
  const labelStyle = { color: 'var(--color-ink-mid)' }

  return (
    <div className="space-y-6 max-w-xl">
      <div className="flex items-center gap-3">
        <Link
          href={voltarUrl}
          className="text-sm transition-colors hover:opacity-70"
          style={{ color: 'var(--color-ink-soft)' }}
        >
          ← Voltar
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

          {/* Nome */}
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

          {/* Nascimento + Sexo */}
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

          {/* CPF */}
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

          {/* Convênio + Turno */}
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

          {/* Responsável */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-sm font-medium" style={labelStyle}>
                Responsável (familiar)
              </label>
              <Link
                href="/admin/usuarios/novo"
                className="text-xs font-medium transition-opacity hover:opacity-70"
                style={{ color: 'var(--color-rose-main)' }}
              >
                + Cadastrar responsável
              </Link>
            </div>
            <select
              value={responsavelSelecionado}
              onChange={e => setResponsavelSelecionado(e.target.value)}
              className="input-base"
            >
              <option value="">Nenhum</option>
              {responsaveis.map(r => (
                <option key={r.id} value={r.id}>{r.nome}</option>
              ))}
            </select>
          </div>

          {/* Profissionais */}
          <div>
            <label className="block text-sm font-medium mb-2" style={labelStyle}>
              Profissionais responsáveis
            </label>
            {terapeutas.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--color-ink-faint)' }}>
                Nenhum profissional cadastrado ainda.
              </p>
            ) : (
              <div className="space-y-2">
                {terapeutas.map(t => (
                  <label key={t.id} className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={terapeutasSelecionados.includes(t.id)}
                      onChange={() => toggleTerapeuta(t.id)}
                      className="w-4 h-4"
                      style={{ accentColor: 'var(--color-rose-main)' }}
                    />
                    <span className="text-sm" style={{ color: 'var(--color-ink-mid)' }}>{t.nome}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Horários */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium" style={labelStyle}>
                Horários de atendimento
              </label>
              <button
                type="button"
                onClick={addHorario}
                className="text-xs font-medium transition-opacity hover:opacity-70"
                style={{ color: 'var(--color-rose-main)' }}
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
                  <input
                    type="text"
                    value={h.hora}
                    onChange={e => updateHorario(i, 'hora', e.target.value)}
                    placeholder="HH:MM"
                    maxLength={5}
                    inputMode="numeric"
                    className="input-base w-24 text-center"
                  />
                  {horarios.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeHorario(i)}
                      className="text-lg leading-none px-1 transition-colors"
                      style={{ color: 'var(--color-ink-faint)' }}
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
            <p className="text-xs mt-1.5" style={{ color: 'var(--color-ink-faint)' }}>
              Use o formato HH:MM (ex: 09:00, 13:30).
            </p>
          </div>

          {erro && (
            <p className="text-sm" style={{ color: '#B91C1C' }}>{erro}</p>
          )}

          <div className="flex gap-3 pt-1">
            <Button type="submit" disabled={carregando}>
              {carregando ? 'Salvando...' : 'Cadastrar paciente'}
            </Button>
            <Button type="button" variant="ghost" onClick={() => router.push(voltarUrl)}>
              Cancelar
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}

export default function NovoPacientePage() {
  return (
    <Suspense>
      <NovoPacienteForm />
    </Suspense>
  )
}
