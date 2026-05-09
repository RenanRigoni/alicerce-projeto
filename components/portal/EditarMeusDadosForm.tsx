'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  nome: string
  telefone: string | null
  contato_emergencia: string | null
  endereco: string | null
  cidade: string | null
  cep: string | null
}

function mascaraTelefone(valor: string) {
  const d = valor.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 2) return d.length ? `(${d}` : ''
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

function mascaraCEP(valor: string) {
  const d = valor.replace(/\D/g, '').slice(0, 8)
  if (d.length <= 5) return d
  return `${d.slice(0, 5)}-${d.slice(5)}`
}

function parsarEmergencia(raw: string | null) {
  if (!raw) return { nome: '', telefone: '' }
  const idx = raw.indexOf(' — ')
  if (idx === -1) return { nome: raw, telefone: '' }
  return { nome: raw.slice(0, idx), telefone: raw.slice(idx + 3) }
}

export function EditarMeusDadosForm({ nome, telefone, contato_emergencia, endereco, cidade, cep }: Props) {
  const router = useRouter()
  const [aberto, setAberto] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState(false)

  const emergenciaInicial = parsarEmergencia(contato_emergencia)

  const [form, setForm] = useState({
    nome:                nome ?? '',
    telefone_principal:  telefone ?? '',
    emergencia_nome:     emergenciaInicial.nome,
    emergencia_telefone: emergenciaInicial.telefone,
    endereco:            endereco ?? '',
    cidade:              cidade ?? '',
    cep:                 cep ?? '',
  })

  function handle(e: React.ChangeEvent<HTMLInputElement>) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  function handleTelefone(e: React.ChangeEvent<HTMLInputElement>) {
    setForm(prev => ({ ...prev, [e.target.name]: mascaraTelefone(e.target.value) }))
  }

  function handleCEP(e: React.ChangeEvent<HTMLInputElement>) {
    setForm(prev => ({ ...prev, cep: mascaraCEP(e.target.value) }))
  }

  async function handleSalvar() {
    if (!form.nome.trim()) { setErro('Nome não pode estar vazio.'); return }
    setErro('')
    setSalvando(true)

    const emergenciaNome = form.emergencia_nome.trim()
    const emergenciaTel  = form.emergencia_telefone.trim()
    const contato_emergencia_final = emergenciaNome && emergenciaTel
      ? `${emergenciaNome} — ${emergenciaTel}`
      : emergenciaNome || emergenciaTel || ''

    const res = await fetch('/api/portal/meus-dados', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nome:               form.nome.trim() || undefined,
        telefone_principal: form.telefone_principal,
        contato_emergencia: contato_emergencia_final,
        endereco:           form.endereco,
        cidade:             form.cidade,
        cep:                form.cep,
      }),
    })

    setSalvando(false)
    if (!res.ok) {
      const json = await res.json()
      setErro(json.error ?? 'Erro ao salvar.')
      return
    }

    setSucesso(true)
    setAberto(false)
    router.refresh()
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    borderRadius: 10,
    padding: '8px 12px',
    fontSize: 14,
    border: '1.5px solid var(--color-border)',
    background: 'var(--color-warm-white)',
    color: 'var(--color-ink)',
    outline: 'none',
  }

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 12,
    fontWeight: 600,
    marginBottom: 4,
    color: 'var(--color-ink-soft)',
  }

  return (
    <>
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={() => { setAberto(v => !v); setSucesso(false); setErro('') }}
          className="text-sm font-medium px-4 py-2 rounded-xl transition-all"
          style={{ background: 'var(--color-border-soft)', color: 'var(--color-ink-mid)' }}
        >
          {aberto ? 'Cancelar edição' : 'Editar meus dados'}
        </button>
        {sucesso && (
          <span className="text-sm" style={{ color: 'var(--color-sage-deep)' }}>
            ✓ Dados atualizados
          </span>
        )}
      </div>

      {aberto && (
        <div className="mt-4 space-y-3 p-4 rounded-2xl border" style={{ borderColor: 'var(--color-border-soft)', background: 'var(--color-bg-alt)' }}>
          <p className="text-xs" style={{ color: 'var(--color-ink-faint)' }}>
            LGPD Art. 18, III — direito de correção de dados incompletos, inexatos ou desatualizados.
          </p>

          <div>
            <label style={labelStyle}>Nome completo</label>
            <input name="nome" value={form.nome} onChange={handle} style={inputStyle} />
          </div>

          <div>
            <label style={labelStyle}>Telefone principal</label>
            <input
              name="telefone_principal"
              value={form.telefone_principal}
              onChange={handleTelefone}
              placeholder="(34) 99999-9999"
              inputMode="numeric"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Contato de emergência</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <input
                name="emergencia_nome"
                value={form.emergencia_nome}
                onChange={handle}
                placeholder="Nome"
                style={inputStyle}
              />
              <input
                name="emergencia_telefone"
                value={form.emergencia_telefone}
                onChange={handleTelefone}
                placeholder="(34) 99999-9999"
                inputMode="numeric"
                style={inputStyle}
              />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Endereço</label>
            <input name="endereco" value={form.endereco} onChange={handle} placeholder="Rua, número, complemento" style={inputStyle} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div>
              <label style={labelStyle}>Cidade</label>
              <input name="cidade" value={form.cidade} onChange={handle} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>CEP</label>
              <input
                name="cep"
                value={form.cep}
                onChange={handleCEP}
                placeholder="00000-000"
                inputMode="numeric"
                style={inputStyle}
              />
            </div>
          </div>

          {erro && <p className="text-sm" style={{ color: '#B91C1C' }}>{erro}</p>}

          <button
            onClick={handleSalvar}
            disabled={salvando}
            className="w-full py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60 transition-all"
            style={{ background: 'linear-gradient(135deg, var(--color-peach-main) 0%, #C87850 100%)' }}
          >
            {salvando ? 'Salvando...' : 'Salvar alterações'}
          </button>
        </div>
      )}
    </>
  )
}
