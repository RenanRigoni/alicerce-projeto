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

export function EditarMeusDadosForm({ nome, telefone, contato_emergencia, endereco, cidade, cep }: Props) {
  const router = useRouter()
  const [aberto, setAberto] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState(false)

  const [form, setForm] = useState({
    nome:               nome ?? '',
    telefone_principal: telefone ?? '',
    contato_emergencia: contato_emergencia ?? '',
    endereco:           endereco ?? '',
    cidade:             cidade ?? '',
    cep:                cep ?? '',
  })

  function handle(e: React.ChangeEvent<HTMLInputElement>) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSalvar() {
    if (!form.nome.trim()) { setErro('Nome não pode estar vazio.'); return }
    setErro('')
    setSalvando(true)

    const res = await fetch('/api/portal/meus-dados', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nome:               form.nome.trim() || undefined,
        telefone_principal: form.telefone_principal,
        contato_emergencia: form.contato_emergencia,
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

          {[
            { label: 'Nome completo', name: 'nome', value: form.nome },
            { label: 'Telefone principal', name: 'telefone_principal', value: form.telefone_principal },
            { label: 'Contato de emergência', name: 'contato_emergencia', value: form.contato_emergencia },
            { label: 'Endereço', name: 'endereco', value: form.endereco },
            { label: 'Cidade', name: 'cidade', value: form.cidade },
            { label: 'CEP', name: 'cep', value: form.cep },
          ].map(campo => (
            <div key={campo.name}>
              <label style={labelStyle}>{campo.label}</label>
              <input
                name={campo.name}
                value={campo.value}
                onChange={handle}
                style={inputStyle}
              />
            </div>
          ))}

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
