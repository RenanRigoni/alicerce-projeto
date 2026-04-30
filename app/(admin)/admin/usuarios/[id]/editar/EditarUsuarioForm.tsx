'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

const roleLabel: Record<string, string> = {
  admin: 'Admin', recepcao: 'Recepção', terapeuta: 'Terapeuta', pai: 'Família',
}

interface Props {
  usuario: { id: string; nome: string; role: string; telefone: string | null; crefito: string | null }
  detalhes: { endereco: string | null; cidade: string | null; cep: string | null; telefone_principal: string | null; contato_emergencia: string | null } | null
}

const inputCls = 'w-full rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 transition-all'
const inputStyle = {
  border: '1px solid var(--color-border)',
  background: 'var(--color-warm-white)',
  color: 'var(--color-ink)',
}

export function EditarUsuarioForm({ usuario, detalhes }: Props) {
  const router = useRouter()
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  const [form, setForm] = useState({
    nome: usuario.nome ?? '',
    telefone: usuario.telefone ?? '',
    crefito: usuario.crefito ?? '',
    // pai extras (in responsaveis_detalhes)
    telefone_principal: detalhes?.telefone_principal ?? '',
    endereco: detalhes?.endereco ?? '',
    cidade: detalhes?.cidade ?? '',
    cep: detalhes?.cep ?? '',
    contato_emergencia: detalhes?.contato_emergencia ?? '',
  })

  function handle(e: React.ChangeEvent<HTMLInputElement>) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    setErro('')

    if (usuario.role === 'terapeuta' && !form.crefito.trim()) {
      setErro('CREFITO é obrigatório para terapeutas (CREFITO Res. 426/2015).')
      return
    }

    setSalvando(true)

    const supabase = createClient()

    const profileUpdate: Record<string, string> = { nome: form.nome }
    if (usuario.role !== 'pai') profileUpdate.telefone = form.telefone
    if (usuario.role === 'terapeuta') profileUpdate.crefito = form.crefito.trim()

    const { error: errProfile } = await supabase
      .from('profiles')
      .update(profileUpdate)
      .eq('id', usuario.id)

    if (errProfile) { setErro(errProfile.message); setSalvando(false); return }

    if (usuario.role === 'pai') {
      const { error: errDet } = await supabase
        .from('responsaveis_detalhes')
        .upsert({
          id: usuario.id,
          telefone_principal: form.telefone_principal,
          endereco: form.endereco || null,
          cidade: form.cidade || null,
          cep: form.cep || null,
          contato_emergencia: form.contato_emergencia || null,
        }, { onConflict: 'id' })

      if (errDet) { setErro(errDet.message); setSalvando(false); return }
    }

    setSalvando(false)
    router.push(`/admin/usuarios/${usuario.id}`)
    router.refresh()
  }

  return (
    <form onSubmit={salvar} className="space-y-6 max-w-xl">
      <div className="flex items-center gap-3 flex-wrap">
        <a
          href={`/admin/usuarios/${usuario.id}`}
          className="text-sm transition-colors hover:opacity-70"
          style={{ color: 'var(--color-ink-soft)' }}
        >
          ← Voltar
        </a>
        <h1 className="text-2xl font-semibold" style={{ fontFamily: 'var(--font-lora)', color: 'var(--color-ink)' }}>
          Editar — {usuario.nome}
        </h1>
      </div>

      <Card>
        <div className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-ink-faint)' }}>
            {roleLabel[usuario.role] ?? usuario.role}
          </p>

          <div>
            <label className="text-xs uppercase tracking-wide mb-1 block" style={{ color: 'var(--color-ink-faint)' }}>
              Nome completo
            </label>
            <input
              name="nome"
              value={form.nome}
              onChange={handle}
              required
              className={inputCls}
              style={inputStyle}
            />
          </div>

          {usuario.role !== 'pai' && (
            <div>
              <label className="text-xs uppercase tracking-wide mb-1 block" style={{ color: 'var(--color-ink-faint)' }}>
                Telefone
              </label>
              <input
                name="telefone"
                value={form.telefone}
                onChange={handle}
                className={inputCls}
                style={inputStyle}
              />
            </div>
          )}

          {usuario.role === 'terapeuta' && (
            <div>
              <label className="text-xs uppercase tracking-wide mb-1 block" style={{ color: 'var(--color-ink-faint)' }}>
                CREFITO
              </label>
              <input
                name="crefito"
                value={form.crefito}
                onChange={handle}
                className={inputCls}
                style={inputStyle}
              />
            </div>
          )}

          {usuario.role === 'pai' && (
            <>
              <div>
                <label className="text-xs uppercase tracking-wide mb-1 block" style={{ color: 'var(--color-ink-faint)' }}>
                  Telefone principal
                </label>
                <input name="telefone_principal" value={form.telefone_principal} onChange={handle} className={inputCls} style={inputStyle} />
              </div>
              <div>
                <label className="text-xs uppercase tracking-wide mb-1 block" style={{ color: 'var(--color-ink-faint)' }}>
                  Endereço
                </label>
                <input name="endereco" value={form.endereco} onChange={handle} className={inputCls} style={inputStyle} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs uppercase tracking-wide mb-1 block" style={{ color: 'var(--color-ink-faint)' }}>
                    Cidade
                  </label>
                  <input name="cidade" value={form.cidade} onChange={handle} className={inputCls} style={inputStyle} />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-wide mb-1 block" style={{ color: 'var(--color-ink-faint)' }}>
                    CEP
                  </label>
                  <input name="cep" value={form.cep} onChange={handle} className={inputCls} style={inputStyle} />
                </div>
              </div>
              <div>
                <label className="text-xs uppercase tracking-wide mb-1 block" style={{ color: 'var(--color-ink-faint)' }}>
                  Contato de emergência
                </label>
                <input name="contato_emergencia" value={form.contato_emergencia} onChange={handle} className={inputCls} style={inputStyle} />
              </div>
            </>
          )}
        </div>
      </Card>

      {erro && <p className="text-sm" style={{ color: '#B91C1C' }}>{erro}</p>}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={salvando}>
          {salvando ? 'Salvando...' : 'Salvar alterações'}
        </Button>
        <a
          href={`/admin/usuarios/${usuario.id}`}
          className="text-sm transition-opacity hover:opacity-70"
          style={{ color: 'var(--color-ink-soft)' }}
        >
          Cancelar
        </a>
      </div>
    </form>
  )
}
