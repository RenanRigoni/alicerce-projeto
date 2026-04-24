'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

const labelStyle = { color: 'var(--color-ink-mid)' }

export function EditarResponsavelTerapeutaForm({ responsavel }: { responsavel: any }) {
  const router = useRouter()
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  const [form, setForm] = useState({
    nome:               responsavel.nome ?? '',
    telefone_principal: responsavel.telefone_principal ?? '',
    endereco:           responsavel.endereco ?? '',
    cidade:             responsavel.cidade ?? '',
    cep:                responsavel.cep ?? '',
    contato_emergencia: responsavel.contato_emergencia ?? '',
  })

  function handle(e: React.ChangeEvent<HTMLInputElement>) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSalvar() {
    if (!form.nome.trim()) { setErro('Nome é obrigatório.'); return }
    setErro('')
    setSalvando(true)

    const res = await fetch(`/api/terapeuta/responsavel/${responsavel.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nome: form.nome.trim(),
        telefone_principal: form.telefone_principal || null,
        endereco: form.endereco || null,
        cidade: form.cidade || null,
        cep: form.cep || null,
        contato_emergencia: form.contato_emergencia || null,
      }),
    })

    setSalvando(false)
    if (!res.ok) { const j = await res.json(); setErro(j.error ?? 'Erro ao salvar.'); return }
    router.push(`/terapia/responsavel/${responsavel.id}`)
  }

  return (
    <div className="space-y-6 max-w-xl">
      <div className="flex items-center gap-3">
        <a href={`/terapia/responsavel/${responsavel.id}`} className="text-sm transition-colors hover:opacity-70" style={{ color: 'var(--color-ink-soft)' }}>
          ← Voltar
        </a>
        <h1 className="text-2xl font-semibold" style={{ fontFamily: 'var(--font-lora)', color: 'var(--color-ink)' }}>
          Editar — {responsavel.nome}
        </h1>
      </div>

      <Card>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5" style={labelStyle}>
              Nome completo <span style={{ color: 'var(--color-rose-main)' }}>*</span>
            </label>
            <input name="nome" value={form.nome} onChange={handle} className="input-base" />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5" style={labelStyle}>Telefone principal</label>
            <input name="telefone_principal" value={form.telefone_principal} onChange={handle} placeholder="(11) 99999-9999" className="input-base" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={labelStyle}>Cidade</label>
              <input name="cidade" value={form.cidade} onChange={handle} className="input-base" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={labelStyle}>CEP</label>
              <input name="cep" value={form.cep} onChange={handle} placeholder="00000-000" className="input-base" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5" style={labelStyle}>Endereço</label>
            <input name="endereco" value={form.endereco} onChange={handle} placeholder="Rua, número, complemento" className="input-base" />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5" style={labelStyle}>Contato de emergência</label>
            <input name="contato_emergencia" value={form.contato_emergencia} onChange={handle} placeholder="Nome e telefone" className="input-base" />
          </div>

          {erro && <p className="text-sm" style={{ color: '#B91C1C' }}>{erro}</p>}

          <div className="flex gap-3 pt-1">
            <Button onClick={handleSalvar} disabled={salvando}>
              {salvando ? 'Salvando...' : 'Salvar alterações'}
            </Button>
            <Button variant="ghost" onClick={() => router.push(`/terapia/responsavel/${responsavel.id}`)}>
              Cancelar
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
