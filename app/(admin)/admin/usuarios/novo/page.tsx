'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { createClient } from '@/lib/supabase/client'

interface Paciente { id: string; nome: string; codigo_interno: string | null }

export default function NovoUsuarioPage() {
  const router = useRouter()
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')
  const [etapa, setEtapa] = useState<'form' | 'vincular'>('form')
  const [novoUserId, setNovoUserId] = useState('')

  const [form, setForm] = useState({ nome: '', email: '', senha: '', role: 'pai', crefito: '' })

  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [pacientesSelecionados, setPacientesSelecionados] = useState<string[]>([])
  const [vinculando, setVinculando] = useState(false)

  useEffect(() => {
    if (form.role !== 'pai') return
    createClient()
      .from('pacientes')
      .select('id, nome, codigo_interno')
      .eq('status', 'ativo')
      .order('nome')
      .then(({ data }) => setPacientes(data ?? []))
  }, [form.role])

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  function togglePaciente(id: string) {
    setPacientesSelecionados(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    setCarregando(true)

    const res = await fetch('/api/admin/criar-usuario', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })

    const json = await res.json()
    setCarregando(false)

    if (!res.ok) { setErro(json.error ?? 'Erro ao criar usuário.'); return }

    if (form.role === 'pai' && json.user_id) {
      setNovoUserId(json.user_id)
      setEtapa('vincular')
    } else {
      router.push('/admin/usuarios')
    }
  }

  async function vincularEConcluir(criarNovo: boolean) {
    setVinculando(true)

    for (const pacienteId of pacientesSelecionados) {
      await fetch('/api/vincular/paciente-responsavel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paciente_id: pacienteId, responsavel_id: novoUserId, tipo: 'principal' }),
      })
    }

    setVinculando(false)

    if (criarNovo) {
      router.push(`/admin/pacientes/novo?responsavel_id=${novoUserId}`)
    } else {
      router.push(`/admin/usuarios/${novoUserId}`)
    }
  }

  const labelStyle = { color: 'var(--color-ink-mid)' }

  // ── Etapa 2: vincular paciente ──────────────────────────────
  if (etapa === 'vincular') {
    return (
      <div className="space-y-6 max-w-xl">
        <div>
          <h1 className="text-2xl font-semibold" style={{ fontFamily: 'var(--font-lora)', color: 'var(--color-ink)' }}>
            Vincular paciente
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-ink-soft)' }}>
            Responsável criado com sucesso. Agora vincule um paciente existente ou cadastre um novo.
          </p>
        </div>

        <Card>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2" style={labelStyle}>
                Pacientes existentes
              </label>
              {pacientes.length === 0 ? (
                <p className="text-sm" style={{ color: 'var(--color-ink-faint)' }}>Nenhum paciente ativo cadastrado.</p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {pacientes.map(p => (
                    <label key={p.id} className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={pacientesSelecionados.includes(p.id)}
                        onChange={() => togglePaciente(p.id)}
                        className="w-4 h-4"
                        style={{ accentColor: 'var(--color-rose-main)' }}
                      />
                      <span className="text-sm" style={{ color: 'var(--color-ink-mid)' }}>
                        {p.codigo_interno && (
                          <span className="font-mono text-xs mr-1.5" style={{ color: 'var(--color-ink-faint)' }}>
                            #{p.codigo_interno}
                          </span>
                        )}
                        {p.nome}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <Button onClick={() => vincularEConcluir(false)} disabled={vinculando}>
                {vinculando ? 'Salvando...' : pacientesSelecionados.length > 0 ? 'Vincular e concluir' : 'Concluir sem vincular'}
              </Button>
              <button
                onClick={() => vincularEConcluir(true)}
                disabled={vinculando}
                className="text-sm font-medium px-4 py-2 rounded-xl transition-all duration-200 disabled:opacity-50"
                style={{ background: 'var(--color-rose-blush)', color: 'var(--color-rose-deep)' }}
              >
                + Cadastrar novo paciente
              </button>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  // ── Etapa 1: formulário ─────────────────────────────────────
  return (
    <div className="space-y-6 max-w-xl">
      <div className="flex items-center gap-3">
        <Link href="/admin/usuarios" className="text-sm transition-colors hover:opacity-70" style={{ color: 'var(--color-ink-soft)' }}>
          ← Voltar
        </Link>
        <h1 className="text-2xl font-semibold" style={{ fontFamily: 'var(--font-lora)', color: 'var(--color-ink)' }}>
          Novo usuário
        </h1>
      </div>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-4">

          <div>
            <label className="block text-sm font-medium mb-1.5" style={labelStyle}>
              Nome completo <span style={{ color: 'var(--color-rose-main)' }}>*</span>
            </label>
            <input name="nome" value={form.nome} onChange={handleChange} required placeholder="Nome completo" className="input-base" />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5" style={labelStyle}>
              E-mail <span style={{ color: 'var(--color-rose-main)' }}>*</span>
            </label>
            <input type="email" name="email" value={form.email} onChange={handleChange} required placeholder="email@exemplo.com" className="input-base" />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5" style={labelStyle}>
              Senha inicial <span style={{ color: 'var(--color-rose-main)' }}>*</span>
            </label>
            <input type="password" name="senha" value={form.senha} onChange={handleChange} required minLength={6} placeholder="Mínimo 6 caracteres" className="input-base" />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5" style={labelStyle}>
              Perfil <span style={{ color: 'var(--color-rose-main)' }}>*</span>
            </label>
            <select name="role" value={form.role} onChange={handleChange} className="input-base">
              <option value="pai">Família (pais/responsáveis)</option>
              <option value="terapeuta">Terapeuta</option>
              <option value="recepcao">Recepção</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          {form.role === 'terapeuta' && (
            <div>
              <label className="block text-sm font-medium mb-1.5" style={labelStyle}>
                CREFITO <span style={{ color: 'var(--color-rose-main)' }}>*</span>
              </label>
              <input
                name="crefito"
                value={form.crefito}
                onChange={handleChange}
                required
                placeholder="Ex: 4/23934-TO"
                className="input-base"
              />
              <p className="text-xs mt-1" style={{ color: 'var(--color-ink-faint)' }}>
                Obrigatório — CREFITO Res. 426/2015
              </p>
            </div>
          )}

          {/* Paciente pré-selecionado (role=pai) */}
          {form.role === 'pai' && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium" style={labelStyle}>
                  Vincular paciente existente
                </label>
                <span className="text-xs" style={{ color: 'var(--color-ink-faint)' }}>opcional</span>
              </div>
              {pacientes.length === 0 ? (
                <p className="text-sm" style={{ color: 'var(--color-ink-faint)' }}>Nenhum paciente ativo encontrado.</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {pacientes.map(p => (
                    <label key={p.id} className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={pacientesSelecionados.includes(p.id)}
                        onChange={() => togglePaciente(p.id)}
                        className="w-4 h-4"
                        style={{ accentColor: 'var(--color-rose-main)' }}
                      />
                      <span className="text-sm" style={{ color: 'var(--color-ink-mid)' }}>
                        {p.codigo_interno && (
                          <span className="font-mono text-xs mr-1.5" style={{ color: 'var(--color-ink-faint)' }}>
                            #{p.codigo_interno}
                          </span>
                        )}
                        {p.nome}
                      </span>
                    </label>
                  ))}
                </div>
              )}
              <p className="text-xs mt-1.5" style={{ color: 'var(--color-ink-faint)' }}>
                Se o paciente ainda não foi cadastrado, você pode cadastrá-lo na próxima etapa.
              </p>
            </div>
          )}

          {erro && <p className="text-sm" style={{ color: '#B91C1C' }}>{erro}</p>}

          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={carregando}>
              {carregando ? 'Criando...' : 'Criar usuário'}
            </Button>
            <Button type="button" variant="ghost" onClick={() => router.push('/admin/usuarios')}>
              Cancelar
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
