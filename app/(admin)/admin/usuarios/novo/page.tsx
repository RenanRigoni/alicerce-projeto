'use client'

import { TIPOS_PROFISSIONAIS, getTipoProfissionalConfig } from '@/lib/profissionais'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

interface Paciente { id: string; nome: string; codigo_interno: string | null }

const FORM_INICIAL = {
  role: 'pai',
  nome: '',
  telefone: '',
  cep: '',
  endereco: '',
  numero: '',
  complemento: '',
  cidade: '',
  contato_emergencia_nome: '',
  contato_emergencia_telefone: '',
  email: '',
  cpf_cnpj: '',
  cpf_cnpj_profissional: '',
  tipo_profissional: 'terapeuta_ocupacional',
  conselho_numero: '',
}

async function buscarCep(cep: string): Promise<{ logradouro: string; localidade: string } | null> {
  const digits = cep.replace(/\D/g, '')
  if (digits.length !== 8) return null
  try {
    const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`)
    const data = await res.json()
    if (data.erro) return null
    return { logradouro: data.logradouro ?? '', localidade: data.localidade ?? '' }
  } catch {
    return null
  }
}

export default function NovoUsuarioPage() {
  const router = useRouter()
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')
  const [etapa, setEtapa] = useState<'form' | 'vincular'>('form')
  const [novoUserId, setNovoUserId] = useState('')
  const [buscandoCep, setBuscandoCep] = useState(false)
  const [form, setForm] = useState(FORM_INICIAL)
  const [linkRecuperacao, setLinkRecuperacao] = useState<string | null>(null)
  const [linkCopiado, setLinkCopiado] = useState(false)

  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [pacientesSelecionados, setPacientesSelecionados] = useState<string[]>([])
  const [vinculando, setVinculando] = useState(false)

  const tipoConfig = getTipoProfissionalConfig(form.tipo_profissional)

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

  async function handleCepBlur(e: React.FocusEvent<HTMLInputElement>) {
    const cep = e.target.value
    if (cep.replace(/\D/g, '').length !== 8) return
    setBuscandoCep(true)
    const resultado = await buscarCep(cep)
    setBuscandoCep(false)
    if (resultado) {
      setForm(prev => ({ ...prev, endereco: resultado.logradouro, cidade: resultado.localidade }))
    }
  }

  function togglePaciente(id: string) {
    setPacientesSelecionados(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    )
  }

  async function copiarLink() {
    if (!linkRecuperacao) return
    await navigator.clipboard.writeText(linkRecuperacao)
    setLinkCopiado(true)
    setTimeout(() => setLinkCopiado(false), 2500)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    setLinkRecuperacao(null)

    if (form.role === 'pai') {
      const cpfDigits = form.cpf_cnpj.replace(/\D/g, '')
      if (cpfDigits.length !== 11) {
        setErro('CPF deve ter 11 dígitos.')
        return
      }
    }

    if (form.role === 'terapeuta' && !form.conselho_numero.trim()) {
      setErro(`${tipoConfig.conselho} é obrigatório para profissionais.`)
      return
    }

    setCarregando(true)

    const payload = {
      nome: form.nome,
      email: form.email,
      role: form.role,
      ...(form.role === 'pai' ? {
        telefone: form.telefone,
        cep: form.cep,
        endereco: form.endereco,
        numero: form.numero,
        complemento: form.complemento,
        cidade: form.cidade,
        contato_emergencia_nome: form.contato_emergencia_nome,
        contato_emergencia_telefone: form.contato_emergencia_telefone,
        cpf_cnpj: form.cpf_cnpj,
      } : {}),
      ...(form.role === 'terapeuta' ? {
        tipo_profissional: form.tipo_profissional,
        conselho_numero: form.conselho_numero,
        cpf_cnpj: form.cpf_cnpj_profissional,
      } : {}),
    }

    const res = await fetch('/api/admin/criar-usuario', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    const json = await res.json()
    setCarregando(false)

    if (!res.ok) { setErro(json.error ?? 'Erro ao criar usuário.'); return }

    if (json.link_recuperacao) {
      setLinkRecuperacao(json.link_recuperacao)
    }

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

  const L = { color: 'var(--color-ink-mid)' }
  const hint = { color: 'var(--color-ink-faint)' }

  if (etapa === 'vincular') {
    return (
      <div className="space-y-6 max-w-xl">
        <div>
          <h1 className="text-2xl font-semibold" style={{ fontFamily: 'var(--font-lora)', color: 'var(--color-ink)' }}>
            Vincular paciente
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-ink-soft)' }}>
            Responsável criado com sucesso.
          </p>
        </div>

        {linkRecuperacao && (
          <div className="rounded-xl p-4 space-y-3" style={{ background: '#FFFBEB', border: '1px solid #FCD34D' }}>
            <p className="text-sm font-medium" style={{ color: '#92400E' }}>
              E-mail não enviado automaticamente. Compartilhe este link diretamente com o usuário para ele definir a senha:
            </p>
            <div className="flex gap-2 items-start">
              <code className="text-xs break-all flex-1 bg-white rounded-lg p-2 border border-yellow-200" style={{ color: '#78350F' }}>
                {linkRecuperacao}
              </code>
              <button
                onClick={copiarLink}
                className="shrink-0 text-xs font-medium px-3 py-2 rounded-lg transition-all"
                style={{ background: linkCopiado ? '#D1FAE5' : '#FEF3C7', color: linkCopiado ? '#065F46' : '#92400E' }}
              >
                {linkCopiado ? 'Copiado!' : 'Copiar'}
              </button>
            </div>
            <p className="text-xs" style={{ color: '#B45309' }}>
              Link válido por 24 horas. Instrua o usuário a abrir no navegador para definir a senha.
            </p>
          </div>
        )}

        <Card>
          <div className="space-y-4">
            <label className="block text-sm font-medium mb-2" style={L}>Pacientes existentes</label>
            {pacientes.length === 0 ? (
              <p className="text-sm" style={hint}>Nenhum paciente ativo cadastrado.</p>
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
                    <span className="text-sm" style={L}>
                      {p.codigo_interno && <span className="font-mono text-xs mr-1.5" style={hint}>#{p.codigo_interno}</span>}
                      {p.nome}
                    </span>
                  </label>
                ))}
              </div>
            )}
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
            <label className="block text-sm font-medium mb-1.5" style={L}>
              Perfil <span style={{ color: 'var(--color-rose-main)' }}>*</span>
            </label>
            <select name="role" value={form.role} onChange={handleChange} className="input-base">
              <option value="pai">Família (pais/responsáveis)</option>
              <option value="terapeuta">Profissional clínico</option>
              <option value="recepcao">Recepção</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5" style={L}>
              Nome completo <span style={{ color: 'var(--color-rose-main)' }}>*</span>
            </label>
            <input name="nome" value={form.nome} onChange={handleChange} required placeholder="Nome completo" className="input-base" />
          </div>

          {form.role === 'pai' && (
            <>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={L}>
                  Telefone principal <span style={{ color: 'var(--color-rose-main)' }}>*</span>
                </label>
                <input name="telefone" value={form.telefone} onChange={handleChange} required placeholder="(00) 00000-0000" className="input-base" />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5" style={L}>
                  CEP <span style={{ color: 'var(--color-rose-main)' }}>*</span>
                </label>
                <div className="relative">
                  <input name="cep" value={form.cep} onChange={handleChange} onBlur={handleCepBlur} required placeholder="00000-000" maxLength={9} className="input-base pr-8" />
                  {buscandoCep && (
                    <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  )}
                </div>
                <p className="text-xs mt-1" style={hint}>Endereço e cidade preenchidos automaticamente</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5" style={L}>
                  Endereço <span style={{ color: 'var(--color-rose-main)' }}>*</span>
                </label>
                <input name="endereco" value={form.endereco} onChange={handleChange} required placeholder="Rua, Avenida..." className="input-base" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={L}>
                    Número <span style={{ color: 'var(--color-rose-main)' }}>*</span>
                  </label>
                  <input name="numero" value={form.numero} onChange={handleChange} required placeholder="123" className="input-base" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={L}>Complemento</label>
                  <input name="complemento" value={form.complemento} onChange={handleChange} placeholder="Apto, Bloco..." className="input-base" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5" style={L}>
                  Cidade <span style={{ color: 'var(--color-rose-main)' }}>*</span>
                </label>
                <input name="cidade" value={form.cidade} onChange={handleChange} required placeholder="Cidade" className="input-base" />
              </div>

              <fieldset className="space-y-3">
                <legend className="text-sm font-medium mb-1.5" style={L}>
                  Contato de Emergência <span style={{ color: 'var(--color-rose-main)' }}>*</span>
                </legend>
                <input name="contato_emergencia_nome" value={form.contato_emergencia_nome} onChange={handleChange} required placeholder="Nome do contato" className="input-base" />
                <input name="contato_emergencia_telefone" value={form.contato_emergencia_telefone} onChange={handleChange} required placeholder="Telefone do contato — (00) 00000-0000" className="input-base" />
              </fieldset>
            </>
          )}

          <div>
            <label className="block text-sm font-medium mb-1.5" style={L}>
              E-mail <span style={{ color: 'var(--color-rose-main)' }}>*</span>
            </label>
            <input type="email" name="email" value={form.email} onChange={handleChange} required placeholder="email@exemplo.com" className="input-base" />
          </div>

          {form.role === 'pai' && (
            <div>
              <label className="block text-sm font-medium mb-1.5" style={L}>
                CPF <span style={{ color: 'var(--color-rose-main)' }}>*</span>
              </label>
              <input name="cpf_cnpj" value={form.cpf_cnpj} onChange={handleChange} required placeholder="000.000.000-00" className="input-base" />
              <p className="text-xs mt-1" style={hint}>Permite acesso pelo CPF na tela de login</p>
            </div>
          )}

          {form.role === 'terapeuta' && (
            <>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={L}>
                  Tipo profissional <span style={{ color: 'var(--color-rose-main)' }}>*</span>
                </label>
                <select name="tipo_profissional" value={form.tipo_profissional} onChange={handleChange} className="input-base" required>
                  {TIPOS_PROFISSIONAIS.map(tipo => (
                    <option key={tipo.value} value={tipo.value}>{tipo.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5" style={L}>
                  {tipoConfig.conselho} <span style={{ color: 'var(--color-rose-main)' }}>*</span>
                </label>
                <input
                  name="conselho_numero"
                  value={form.conselho_numero}
                  onChange={handleChange}
                  required
                  placeholder={tipoConfig.conselho === 'CBO' ? 'Ex: 2394-40' : 'Número do registro'}
                  className="input-base"
                />
                <p className="text-xs mt-1" style={hint}>Obrigatório para assinatura e identificação profissional</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5" style={L}>
                  CPF ou CNPJ <span className="text-xs font-normal" style={hint}>(opcional)</span>
                </label>
                <input
                  name="cpf_cnpj_profissional"
                  value={form.cpf_cnpj_profissional}
                  onChange={handleChange}
                  placeholder="000.000.000-00 ou 00.000.000/0001-00"
                  className="input-base"
                />
              </div>
            </>
          )}

          <div className="rounded-xl px-4 py-3 text-sm" style={{ background: 'var(--color-rose-blush)', color: 'var(--color-ink-mid)' }}>
            Senha inicial: <strong>alicerce</strong> — usuário receberá e-mail para definir nova senha.
          </div>

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
