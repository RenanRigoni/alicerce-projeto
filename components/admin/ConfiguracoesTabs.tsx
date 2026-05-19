'use client'

import { useState, useTransition } from 'react'
import { salvarDadosClinica, salvarPreferencias, salvarHorarios } from '@/app/(admin)/admin/configuracoes/actions'
import { CheckCircle, Loader2 } from 'lucide-react'

interface Config {
  nome_fantasia: string | null
  razao_social: string | null
  tipo_pessoa: string | null
  cpf_cnpj: string | null
  email: string | null
  telefone: string | null
  cep: string | null
  logradouro: string | null
  numero: string | null
  complemento: string | null
  bairro: string | null
  cidade: string | null
  estado: string | null
  intervalo_agenda: number | null
  primeiro_dia_semana: number | null
  bloquear_feriados: boolean | null
}

interface Horario {
  dia_semana: number
  hora_inicio: string
  hora_fim: string
}

const DIAS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
const TABS = ['Dados da Clínica', 'Preferências', 'Horários']

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-ink-mid)' }}>
      {children}
    </label>
  )
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="input-base"
    />
  )
}

function Select({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...props} className="input-base">
      {children}
    </select>
  )
}

function SaveButton({ pending }: { pending: boolean }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-medium transition-all disabled:opacity-60"
      style={{ background: 'var(--color-rose-main)', color: '#fff' }}
    >
      {pending ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle size={15} />}
      {pending ? 'Salvando…' : 'Salvar'}
    </button>
  )
}

function Toast({ msg }: { msg: string }) {
  return (
    <span className="text-sm" style={{ color: 'var(--color-sage-main)' }}>
      {msg}
    </span>
  )
}

// ─── Aba: Dados da Clínica ────────────────────────────────────────────────────
function TabDados({ config }: { config: Config | null }) {
  const [pending, startTransition] = useTransition()
  const [ok, setOk] = useState(false)
  const [cepLoading, setCepLoading] = useState(false)
  const [form, setForm] = useState({
    nome_fantasia: config?.nome_fantasia ?? '',
    razao_social:  config?.razao_social  ?? '',
    tipo_pessoa:   config?.tipo_pessoa   ?? 'PJ',
    cpf_cnpj:      config?.cpf_cnpj      ?? '',
    email:         config?.email          ?? '',
    telefone:      config?.telefone      ?? '',
    cep:           config?.cep            ?? '',
    logradouro:    config?.logradouro    ?? '',
    numero:        config?.numero        ?? '',
    complemento:   config?.complemento   ?? '',
    bairro:        config?.bairro        ?? '',
    cidade:        config?.cidade        ?? '',
    estado:        config?.estado        ?? '',
  })

  function set(key: keyof typeof form, value: string) {
    setForm(f => ({ ...f, [key]: value }))
    setOk(false)
  }

  async function buscarCep(cep: string) {
    const clean = cep.replace(/\D/g, '')
    if (clean.length !== 8) return
    setCepLoading(true)
    try {
      const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`)
      const data = await res.json()
      if (!data.erro) {
        setForm(f => ({
          ...f,
          logradouro: data.logradouro ?? f.logradouro,
          bairro:     data.bairro     ?? f.bairro,
          cidade:     data.localidade ?? f.cidade,
          estado:     data.uf         ?? f.estado,
        }))
      }
    } finally {
      setCepLoading(false)
    }
  }

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      await salvarDadosClinica(fd)
      setOk(true)
    })
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      {/* Identificação */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label>Nome fantasia</Label>
          <Input name="nome_fantasia" value={form.nome_fantasia} onChange={e => set('nome_fantasia', e.target.value)} placeholder="Ex: Espaço Alicerce" />
        </div>
        <div>
          <Label>Razão social</Label>
          <Input name="razao_social" value={form.razao_social} onChange={e => set('razao_social', e.target.value)} placeholder="Ex: Alicerce Ltda." />
        </div>
        <div>
          <Label>Tipo de pessoa</Label>
          <Select name="tipo_pessoa" value={form.tipo_pessoa} onChange={e => set('tipo_pessoa', e.target.value)}>
            <option value="PJ">Pessoa Jurídica (CNPJ)</option>
            <option value="PF">Pessoa Física (CPF)</option>
          </Select>
        </div>
        <div>
          <Label>{form.tipo_pessoa === 'PF' ? 'CPF' : 'CNPJ'}</Label>
          <Input name="cpf_cnpj" value={form.cpf_cnpj} onChange={e => set('cpf_cnpj', e.target.value)} placeholder={form.tipo_pessoa === 'PF' ? '000.000.000-00' : '00.000.000/0000-00'} />
        </div>
        <div>
          <Label>E-mail</Label>
          <Input name="email" type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="contato@clinica.com.br" />
        </div>
        <div>
          <Label>Telefone</Label>
          <Input name="telefone" value={form.telefone} onChange={e => set('telefone', e.target.value)} placeholder="(00) 00000-0000" />
        </div>
      </div>

      {/* Endereço */}
      <div className="pt-2" style={{ borderTop: '1px solid var(--color-border-soft)' }}>
        <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--color-ink-soft)' }}>Endereço</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <Label>CEP</Label>
            <div className="relative">
              <Input
                name="cep"
                value={form.cep}
                onChange={e => set('cep', e.target.value)}
                onBlur={e => buscarCep(e.target.value)}
                placeholder="00000-000"
                maxLength={9}
              />
              {cepLoading && (
                <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin" style={{ color: 'var(--color-ink-soft)' }} />
              )}
            </div>
          </div>
          <div className="sm:col-span-2">
            <Label>Logradouro</Label>
            <Input name="logradouro" value={form.logradouro} onChange={e => set('logradouro', e.target.value)} placeholder="Rua, Av., etc." />
          </div>
          <div>
            <Label>Número</Label>
            <Input name="numero" value={form.numero} onChange={e => set('numero', e.target.value)} placeholder="123" />
          </div>
          <div>
            <Label>Complemento</Label>
            <Input name="complemento" value={form.complemento} onChange={e => set('complemento', e.target.value)} placeholder="Sala, andar…" />
          </div>
          <div>
            <Label>Bairro</Label>
            <Input name="bairro" value={form.bairro} onChange={e => set('bairro', e.target.value)} placeholder="Bairro" />
          </div>
          <div>
            <Label>Cidade</Label>
            <Input name="cidade" value={form.cidade} onChange={e => set('cidade', e.target.value)} placeholder="Cidade" />
          </div>
          <div>
            <Label>Estado</Label>
            <Select name="estado" value={form.estado} onChange={e => set('estado', e.target.value)}>
              <option value="">Selecione</option>
              {['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'].map(uf => (
                <option key={uf} value={uf}>{uf}</option>
              ))}
            </Select>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 pt-2">
        <SaveButton pending={pending} />
        {ok && <Toast msg="Salvo com sucesso!" />}
      </div>
    </form>
  )
}

// ─── Aba: Preferências ────────────────────────────────────────────────────────
function TabPreferencias({ config }: { config: Config | null }) {
  const [pending, startTransition] = useTransition()
  const [ok, setOk] = useState(false)
  const [intervalo, setIntervalo] = useState(String(config?.intervalo_agenda ?? 50))
  const [primeiroDia, setPrimeiroDia] = useState(String(config?.primeiro_dia_semana ?? 1))
  const [bloquear, setBloquear] = useState(config?.bloquear_feriados ?? false)

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const fd = new FormData()
    fd.set('intervalo_agenda', intervalo)
    fd.set('primeiro_dia_semana', primeiroDia)
    fd.set('bloquear_feriados', String(bloquear))
    startTransition(async () => {
      await salvarPreferencias(fd)
      setOk(true)
    })
  }

  return (
    <form onSubmit={submit} className="space-y-5 max-w-sm">
      <div>
        <Label>Intervalo padrão dos atendimentos</Label>
        <Select value={intervalo} onChange={e => { setIntervalo(e.target.value); setOk(false) }}>
          <option value="30">30 minutos</option>
          <option value="45">45 minutos</option>
          <option value="50">50 minutos</option>
          <option value="60">60 minutos</option>
        </Select>
      </div>

      <div>
        <Label>Primeiro dia da semana</Label>
        <Select value={primeiroDia} onChange={e => { setPrimeiroDia(e.target.value); setOk(false) }}>
          <option value="0">Domingo</option>
          <option value="1">Segunda-feira</option>
        </Select>
      </div>

      <div
        className="flex items-center justify-between p-4 rounded-2xl cursor-pointer"
        style={{ background: 'var(--color-border-soft)' }}
        onClick={() => { setBloquear(v => !v); setOk(false) }}
      >
        <div>
          <p className="text-sm font-medium" style={{ color: 'var(--color-ink)' }}>Bloquear feriados automaticamente</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-ink-soft)' }}>Impede agendamentos em feriados nacionais</p>
        </div>
        <div
          className="relative ml-4 w-10 h-[22px] rounded-full transition-colors shrink-0"
          style={{ background: bloquear ? 'var(--color-rose-main)' : 'var(--color-border)' }}
        >
          <div
            className="absolute top-[3px] h-4 w-4 rounded-full bg-white shadow transition-all"
            style={{ left: bloquear ? 'calc(100% - 19px)' : '3px' }}
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <SaveButton pending={pending} />
        {ok && <Toast msg="Salvo com sucesso!" />}
      </div>
    </form>
  )
}

// ─── Aba: Horários ────────────────────────────────────────────────────────────
function TabHorarios({ horarios }: { horarios: Horario[] }) {
  const [pending, startTransition] = useTransition()
  const [ok, setOk] = useState(false)

  const initDias = Array.from({ length: 7 }, (_, i) => {
    const found = horarios.find(h => h.dia_semana === i)
    return {
      dia_semana:  i,
      ativo:       !!found,
      hora_inicio: found?.hora_inicio?.slice(0, 5) ?? '08:00',
      hora_fim:    found?.hora_fim?.slice(0, 5)    ?? '18:00',
    }
  })

  const [dias, setDias] = useState(initDias)

  function toggle(idx: number) {
    setDias(d => d.map((dia, i) => i === idx ? { ...dia, ativo: !dia.ativo } : dia))
    setOk(false)
  }

  function setHora(idx: number, field: 'hora_inicio' | 'hora_fim', val: string) {
    setDias(d => d.map((dia, i) => i === idx ? { ...dia, [field]: val } : dia))
    setOk(false)
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const ativos = dias
      .filter(d => d.ativo)
      .map(({ dia_semana, hora_inicio, hora_fim }) => ({ dia_semana, hora_inicio, hora_fim }))
    startTransition(async () => {
      await salvarHorarios(ativos)
      setOk(true)
    })
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <p className="text-xs mb-4" style={{ color: 'var(--color-ink-soft)' }}>
        Defina os dias e horários de funcionamento da clínica. Dias desativados não aparecem na grade de agenda.
      </p>

      <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
        {dias.map((dia, idx) => (
          <div
            key={dia.dia_semana}
            className="flex items-center gap-4 px-4 py-3"
            style={{
              borderBottom: idx < 6 ? '1px solid var(--color-border-soft)' : undefined,
              background: dia.ativo ? 'var(--color-warm-white)' : 'var(--color-border-soft)',
              opacity: dia.ativo ? 1 : 0.65,
              transition: 'all 0.15s',
            }}
          >
            {/* Toggle */}
            <label className="flex items-center gap-2 cursor-pointer select-none w-28 shrink-0">
              <div
                className="relative w-8 h-[18px] rounded-full transition-colors"
                style={{ background: dia.ativo ? 'var(--color-rose-main)' : 'var(--color-border)' }}
                onClick={() => toggle(idx)}
              >
                <div
                  className="absolute top-0.5 h-3.5 w-3.5 rounded-full bg-white shadow transition-all"
                  style={{ left: dia.ativo ? 'calc(100% - 18px)' : '2px' }}
                />
              </div>
              <span className="text-sm font-medium" style={{ color: 'var(--color-ink)' }}>
                {DIAS[dia.dia_semana]}
              </span>
            </label>

            {/* Times */}
            <div className="flex items-center gap-2 flex-1">
              <input
                type="time"
                value={dia.hora_inicio}
                onChange={e => setHora(idx, 'hora_inicio', e.target.value)}
                disabled={!dia.ativo}
                className="input-base py-1.5 text-sm w-32 disabled:opacity-50"
              />
              <span className="text-xs" style={{ color: 'var(--color-ink-soft)' }}>até</span>
              <input
                type="time"
                value={dia.hora_fim}
                onChange={e => setHora(idx, 'hora_fim', e.target.value)}
                disabled={!dia.ativo}
                className="input-base py-1.5 text-sm w-32 disabled:opacity-50"
              />
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-4 pt-1">
        <SaveButton pending={pending} />
        {ok && <Toast msg="Salvo com sucesso!" />}
      </div>
    </form>
  )
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export function ConfiguracoesTabs({
  config,
  horarios,
}: {
  config: Config | null
  horarios: Horario[]
}) {
  const [tab, setTab] = useState(0)

  return (
    <div
      className="rounded-3xl p-6"
      style={{ background: 'var(--color-warm-white)', border: '1px solid var(--color-border)' }}
    >
      {/* Tab bar */}
      <div className="flex gap-1 mb-6 p-1 rounded-xl w-fit" style={{ background: 'var(--color-border-soft)' }}>
        {TABS.map((t, i) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(i)}
            className="px-4 py-1.5 rounded-lg text-sm font-medium transition-all"
            style={{
              background: tab === i ? 'var(--color-warm-white)' : 'transparent',
              color: tab === i ? 'var(--color-ink)' : 'var(--color-ink-soft)',
              boxShadow: tab === i ? '0 1px 4px rgba(44,32,24,0.08)' : 'none',
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 0 && <TabDados config={config} />}
      {tab === 1 && <TabPreferencias config={config} />}
      {tab === 2 && <TabHorarios horarios={horarios} />}
    </div>
  )
}
