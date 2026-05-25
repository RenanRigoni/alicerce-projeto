'use client'

import {
  TIPOS_PROFISSIONAIS, UFS_BRASIL,
  getTipoProfissionalConfig, isCodigoCboValido, normalizarCodigoCbo,
} from '@/lib/profissionais'
import { createClient } from '@/lib/supabase/client'
import { mascaraCpfCnpj } from '@/lib/masks'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

const roleLabel: Record<string, string> = {
  admin: 'Admin', recepcao: 'Recepção', terapeuta: 'Profissional', pai: 'Família',
}

function mascaraTelefone(valor: string) {
  const d = valor.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 2) return d.length ? `(${d}` : ''
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

function mascaraCEP(valor: string) {
  const d = valor.replace(/\D/g, '').slice(0, 8)
  return d.length <= 5 ? d : `${d.slice(0, 5)}-${d.slice(5)}`
}


function parsarEmergencia(raw: string | null) {
  if (!raw) return { nome: '', telefone: '' }
  const idx = raw.indexOf(' — ')
  if (idx === -1) return { nome: raw, telefone: '' }
  return { nome: raw.slice(0, idx), telefone: raw.slice(idx + 3) }
}

interface Props {
  usuario: {
    id: string
    nome: string
    email: string | null
    role: string
    telefone: string | null
    crefito: string | null
    cpf_cnpj?: string | null
    tipo_profissional?: string | null
    conselho_tipo?: string | null
    conselho_numero?: string | null
    conselho_uf?: string | null
    cbo_codigo?: string | null
    data_nascimento?: string | null
    sexo?: string | null
    especialidade?: string | null
    biografia?: string | null
  }
  detalhes: {
    endereco: string | null
    cidade: string | null
    cep: string | null
    numero: string | null
    complemento: string | null
    telefone_principal: string | null
    contato_emergencia: string | null
  } | null
}

const inputCls = 'w-full rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 transition-all'
const inputStyle = {
  border: '1px solid var(--color-border)',
  background: 'var(--color-warm-white)',
  color: 'var(--color-ink)',
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-xs uppercase tracking-wide mb-1 block font-medium" style={{ color: 'var(--color-ink-faint)' }}>
      {children}
    </label>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ border: '1px solid var(--color-border-soft)', background: 'var(--color-warm-white)' }}
    >
      <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--color-border-soft)' }}>
        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-ink-soft)' }}>
          {title}
        </span>
      </div>
      <div className="px-6 py-5 space-y-5">{children}</div>
    </div>
  )
}

export function EditarUsuarioForm({ usuario, detalhes }: Props) {
  const router = useRouter()
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  const emergenciaInicial = parsarEmergencia(detalhes?.contato_emergencia ?? null)

  const [form, setForm] = useState({
    nome:              usuario.nome ?? '',
    email:             usuario.email ?? '',
    telefone:          mascaraTelefone(usuario.telefone ?? ''),
    cpf_cnpj:          mascaraCpfCnpj(usuario.cpf_cnpj ?? ''),
    data_nascimento:   usuario.data_nascimento ?? '',
    sexo:              usuario.sexo ?? '',
    // terapeuta
    tipo_profissional: usuario.tipo_profissional ?? 'terapeuta_ocupacional',
    conselho_numero:   usuario.conselho_numero ?? usuario.crefito ?? '',
    conselho_uf:       usuario.conselho_uf ?? '',
    cbo_codigo:        usuario.cbo_codigo ?? '',
    especialidade:     usuario.especialidade ?? '',
    biografia:         usuario.biografia ?? '',
    // pai
    telefone_principal:   mascaraTelefone(detalhes?.telefone_principal ?? ''),
    endereco:             detalhes?.endereco ?? '',
    numero:               detalhes?.numero ?? '',
    complemento:          detalhes?.complemento ?? '',
    cidade:               detalhes?.cidade ?? '',
    cep:                  mascaraCEP(detalhes?.cep ?? ''),
    emergencia_nome:      emergenciaInicial.nome,
    emergencia_telefone:  mascaraTelefone(emergenciaInicial.telefone),
  })

  const tipoConfig = getTipoProfissionalConfig(form.tipo_profissional)

  function handle(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }
  function handleTel(field: string) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm(prev => ({ ...prev, [field]: mascaraTelefone(e.target.value) }))
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    setErro('')

    if (!form.nome.trim() || !form.email.trim()) {
      setErro('Nome e e-mail são obrigatórios.')
      return
    }
    if (usuario.role === 'terapeuta' && !form.conselho_numero.trim()) {
      setErro(`${tipoConfig.conselho} é obrigatório para profissionais.`)
      return
    }
    if (usuario.role === 'terapeuta' && !isCodigoCboValido(normalizarCodigoCbo(form.cbo_codigo))) {
      setErro('Código CBO deve ter 6 dígitos.')
      return
    }

    setSalvando(true)

    const res = await fetch(`/api/usuario/${usuario.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nome:           form.nome,
        email:          form.email,
        telefone:       form.telefone,
        data_nascimento: form.data_nascimento || null,
        sexo:           form.sexo || null,
        ...(usuario.role === 'terapeuta' ? {
          tipo_profissional: form.tipo_profissional,
          conselho_numero:   form.conselho_numero,
          conselho_uf:       form.conselho_uf,
          cbo_codigo:        form.cbo_codigo,
          cpf_cnpj:          form.cpf_cnpj,
          especialidade:     form.especialidade || null,
          biografia:         form.biografia || null,
        } : {}),
      }),
    })

    const json = await res.json().catch(() => ({}))
    if (!res.ok) { setErro(json.error ?? 'Erro ao salvar.'); setSalvando(false); return }

    // Dados de responsável (pai) — via supabase client direto
    if (usuario.role === 'pai') {
      const supabase = createClient()
      const emergenciaNome = form.emergencia_nome.trim()
      const emergenciaTel  = form.emergencia_telefone.trim()
      const contato_emergencia = emergenciaNome && emergenciaTel
        ? `${emergenciaNome} — ${emergenciaTel}`
        : emergenciaNome || emergenciaTel || null

      const { error: errDet } = await supabase
        .from('responsaveis_detalhes')
        .upsert({
          id: usuario.id,
          telefone_principal: form.telefone_principal || null,
          endereco:    form.endereco || null,
          numero:      form.numero || null,
          complemento: form.complemento || null,
          cidade:      form.cidade || null,
          cep:         form.cep || null,
          contato_emergencia,
        }, { onConflict: 'id' })

      if (errDet) { setErro(errDet.message); setSalvando(false); return }
    }

    setSalvando(false)
    router.push(`/admin/usuarios/${usuario.id}`)
    router.refresh()
  }

  return (
    <form onSubmit={salvar} className="space-y-5 max-w-2xl">
      <div className="flex items-center gap-3 flex-wrap">
        <a href={`/admin/usuarios/${usuario.id}`} className="text-sm transition-opacity hover:opacity-70" style={{ color: 'var(--color-ink-soft)' }}>
          ← Voltar
        </a>
        <h1 className="text-2xl font-semibold" style={{ fontFamily: 'var(--font-lora)', color: 'var(--color-ink)' }}>
          Editar — {usuario.nome}
        </h1>
        <span
          className="text-xs px-2.5 py-0.5 rounded-full font-medium"
          style={{ background: 'var(--color-border-soft)', color: 'var(--color-ink-mid)' }}
        >
          {roleLabel[usuario.role] ?? usuario.role}
        </span>
      </div>

      {/* ── Dados pessoais ── */}
      <Section title="Dados pessoais">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4">

          <div>
            <Label>Nome completo *</Label>
            <input name="nome" value={form.nome} onChange={handle} required className={inputCls} style={inputStyle} />
          </div>

          <div>
            <Label>E-mail *</Label>
            <input type="email" name="email" value={form.email} onChange={handle} required className={inputCls} style={inputStyle} />
          </div>

          {usuario.role !== 'pai' && (
            <div>
              <Label>Telefone</Label>
              <input name="telefone" value={form.telefone} onChange={handleTel('telefone')} placeholder="(00) 00000-0000" inputMode="numeric" className={inputCls} style={inputStyle} />
            </div>
          )}

          <div>
            <Label>Data de nascimento</Label>
            <input type="date" name="data_nascimento" value={form.data_nascimento} onChange={handle} className={inputCls} style={inputStyle} />
          </div>

          <div>
            <Label>CPF / CNPJ</Label>
            <input
              name="cpf_cnpj"
              value={form.cpf_cnpj}
              onChange={e => setForm(prev => ({ ...prev, cpf_cnpj: mascaraCpfCnpj(e.target.value) }))}
              placeholder="000.000.000-00"
              inputMode="numeric"
              className={inputCls}
              style={inputStyle}
            />
          </div>

          <div>
            <Label>Sexo</Label>
            <div className="flex gap-2">
              {(['feminino', 'masculino', 'outro'] as const).map(op => (
                <button
                  key={op}
                  type="button"
                  onClick={() => setForm(prev => ({ ...prev, sexo: prev.sexo === op ? '' : op }))}
                  className="flex-1 py-2 rounded-xl text-sm transition-all"
                  style={{
                    border: form.sexo === op ? '1.5px solid var(--color-rose-main)' : '1px solid var(--color-border)',
                    background: form.sexo === op ? 'var(--color-rose-blush)' : 'transparent',
                    color: form.sexo === op ? 'var(--color-rose-main)' : 'var(--color-ink-mid)',
                    fontWeight: form.sexo === op ? 500 : 400,
                  }}
                >
                  {op.charAt(0).toUpperCase() + op.slice(1)}
                </button>
              ))}
            </div>
          </div>

        </div>
      </Section>

      {/* ── Informações profissionais (terapeuta) ── */}
      {usuario.role === 'terapeuta' && (
        <Section title="Informações profissionais">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4">

            <div>
              <Label>Tipo profissional</Label>
              <select name="tipo_profissional" value={form.tipo_profissional} onChange={handle} className={inputCls} style={inputStyle}>
                {TIPOS_PROFISSIONAIS.map(tipo => (
                  <option key={tipo.value} value={tipo.value}>{tipo.label}</option>
                ))}
              </select>
            </div>

            <div>
              <Label>{tipoConfig.conselho} *</Label>
              <input name="conselho_numero" value={form.conselho_numero} onChange={handle} className={inputCls} style={inputStyle} />
            </div>

            <div>
              <Label>UF do conselho</Label>
              <select name="conselho_uf" value={form.conselho_uf} onChange={handle} className={inputCls} style={inputStyle}>
                <option value="">Não informado</option>
                {UFS_BRASIL.map(uf => <option key={uf} value={uf}>{uf}</option>)}
              </select>
            </div>

            <div>
              <Label>Código CBO</Label>
              <input
                name="cbo_codigo"
                value={form.cbo_codigo}
                onChange={handle}
                placeholder="Ex: 2238-10"
                inputMode="numeric"
                className={inputCls}
                style={inputStyle}
              />
            </div>

            <div className="sm:col-span-2">
              <Label>Especialidade</Label>
              <input name="especialidade" value={form.especialidade} onChange={handle} placeholder="Ex: Integração Sensorial" className={inputCls} style={inputStyle} />
            </div>

            <div className="sm:col-span-2">
              <Label>Biografia</Label>
              <textarea
                name="biografia"
                value={form.biografia}
                onChange={handle}
                rows={4}
                placeholder="Apresentação profissional..."
                className={inputCls}
                style={{ ...inputStyle, resize: 'vertical' }}
              />
            </div>

          </div>
        </Section>
      )}

      {/* ── Dados de responsável (pai) ── */}
      {usuario.role === 'pai' && (
        <Section title="Dados de responsável">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4">

            <div>
              <Label>Telefone principal</Label>
              <input name="telefone_principal" value={form.telefone_principal} onChange={handleTel('telefone_principal')} placeholder="(34) 99999-9999" inputMode="numeric" className={inputCls} style={inputStyle} />
            </div>

            <div>
              <Label>Endereço</Label>
              <input name="endereco" value={form.endereco} onChange={handle} className={inputCls} style={inputStyle} />
            </div>

            <div>
              <Label>Número</Label>
              <input name="numero" value={form.numero} onChange={handle} className={inputCls} style={inputStyle} />
            </div>

            <div>
              <Label>Complemento</Label>
              <input name="complemento" value={form.complemento} onChange={handle} className={inputCls} style={inputStyle} />
            </div>

            <div>
              <Label>Cidade</Label>
              <input name="cidade" value={form.cidade} onChange={handle} className={inputCls} style={inputStyle} />
            </div>

            <div>
              <Label>CEP</Label>
              <input
                name="cep"
                value={form.cep}
                onChange={e => setForm(prev => ({ ...prev, cep: mascaraCEP(e.target.value) }))}
                placeholder="00000-000"
                inputMode="numeric"
                className={inputCls}
                style={inputStyle}
              />
            </div>

            <div>
              <Label>Contato de emergência — nome</Label>
              <input name="emergencia_nome" value={form.emergencia_nome} onChange={handle} placeholder="Nome" className={inputCls} style={inputStyle} />
            </div>

            <div>
              <Label>Contato de emergência — telefone</Label>
              <input name="emergencia_telefone" value={form.emergencia_telefone} onChange={handleTel('emergencia_telefone')} placeholder="(34) 99999-9999" inputMode="numeric" className={inputCls} style={inputStyle} />
            </div>

          </div>
        </Section>
      )}

      {erro && (
        <p className="text-sm font-medium" style={{ color: '#B91C1C' }}>{erro}</p>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={salvando}
          className="px-5 py-2.5 rounded-xl text-sm font-medium transition-opacity disabled:opacity-60"
          style={{ background: 'var(--color-rose-main)', color: '#fff' }}
        >
          {salvando ? 'Salvando...' : 'Salvar alterações'}
        </button>
        <a href={`/admin/usuarios/${usuario.id}`} className="text-sm transition-opacity hover:opacity-70" style={{ color: 'var(--color-ink-soft)' }}>
          Cancelar
        </a>
      </div>
    </form>
  )
}
