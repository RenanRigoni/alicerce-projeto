'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { AvisoCep } from '@/components/endereco/AvisoCep'
import { mascaraCep, mascaraCepDoEvento } from '@/lib/endereco/cep'
import { formatarTelefone, somenteDigitosTelefone, validarTelefone } from '@/lib/telefone'
import { CampoTelefone } from '@/components/ui/CampoTelefone'
import { useCep } from '@/lib/endereco/use-cep'

const labelStyle = { color: 'var(--color-ink-mid)' }

function parsarEmergencia(raw: string | null) {
  if (!raw) return { nome: '', telefone: '' }
  const idx = raw.indexOf(' — ')
  if (idx === -1) return { nome: raw, telefone: '' }
  return { nome: raw.slice(0, idx), telefone: raw.slice(idx + 3) }
}

export function EditarResponsavelTerapeutaForm({ responsavel }: { responsavel: any }) {
  const router = useRouter()
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  const emergenciaInicial = parsarEmergencia(responsavel.contato_emergencia)

  const [form, setForm] = useState({
    nome:               responsavel.nome ?? '',
    telefone_principal: somenteDigitosTelefone(responsavel.telefone_principal),
    endereco:           responsavel.endereco ?? '',
    cidade:             responsavel.cidade ?? '',
    cep:                mascaraCep(responsavel.cep ?? ''),
    emergencia_nome:    emergenciaInicial.nome,
    emergencia_telefone: somenteDigitosTelefone(emergenciaInicial.telefone),
  })
  const campoCep = useCep({
    cepInicial: responsavel.cep,
    onEndereco: e => setForm(prev => ({
      ...prev,
      endereco: e.logradouro || prev.endereco,
      cidade: e.localidade || prev.cidade,
    })),
  })

  function handle(e: React.ChangeEvent<HTMLInputElement>) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  function handleTelefone(campo: 'telefone_principal' | 'emergencia_telefone') {
    return (digitos: string) => setForm(prev => ({ ...prev, [campo]: digitos }))
  }

  function handleCEP(e: React.ChangeEvent<HTMLInputElement>) {
    setForm(prev => ({ ...prev, cep: mascaraCepDoEvento(e) }))
    campoCep.aoDigitar()
  }

  async function handleSalvar() {
    if (!form.nome.trim()) { setErro('Nome é obrigatório.'); return }
    const erroCep = campoCep.validarParaSalvar(form.cep)
    if (erroCep) { setErro(erroCep); return }
    for (const t of [form.telefone_principal, form.emergencia_telefone]) {
      const v = validarTelefone(t)
      if (!v.valido) { setErro(v.mensagem); return }
    }
    setErro('')
    setSalvando(true)

    const emergenciaNome = form.emergencia_nome.trim()
    const emergenciaTel  = formatarTelefone(form.emergencia_telefone)
    const contato_emergencia = emergenciaNome && emergenciaTel
      ? `${emergenciaNome} — ${emergenciaTel}`
      : emergenciaNome || emergenciaTel || null

    const res = await fetch(`/api/terapeuta/responsavel/${responsavel.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nome: form.nome.trim(),
        telefone_principal: form.telefone_principal || null,
        endereco: form.endereco || null,
        cidade: form.cidade || null,
        cep: form.cep || null,
        contato_emergencia,
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
            <CampoTelefone value={form.telefone_principal} onChange={handleTelefone('telefone_principal')} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={labelStyle}>Cidade</label>
              <input name="cidade" value={form.cidade} onChange={handle} className="input-base" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={labelStyle}>CEP</label>
              <input
                name="cep"
                value={form.cep}
                onChange={handleCEP}
                onBlur={e => campoCep.aoSairDoCampo(e.target.value)}
                placeholder="00000-000"
                inputMode="numeric"
                className="input-base"
              />
              <AvisoCep aviso={campoCep.aviso} buscando={campoCep.buscando} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5" style={labelStyle}>Endereço</label>
            <input name="endereco" value={form.endereco} onChange={handle} placeholder="Rua, número, complemento" className="input-base" />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5" style={labelStyle}>Contato de emergência</label>
            <div className="space-y-3">
              <input
                name="emergencia_nome"
                value={form.emergencia_nome}
                onChange={handle}
                placeholder="Nome"
                className="input-base"
              />
              <CampoTelefone value={form.emergencia_telefone} onChange={handleTelefone('emergencia_telefone')} />
            </div>
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
