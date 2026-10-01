'use client'

import { useState } from 'react'
import { StatusConvite, type DadosConvite } from '@/components/admin/StatusConvite'
import { Button } from '@/components/ui/Button'
import { AvisoCep } from '@/components/endereco/AvisoCep'
import { mascaraCep, mascaraCepDoEvento } from '@/lib/endereco/cep'
import { useCep } from '@/lib/endereco/use-cep'
import { mascaraCpf } from '@/lib/masks'
import { validarTelefone } from '@/lib/telefone'
import { CampoTelefone } from '@/components/ui/CampoTelefone'
import { UFS_BRASIL } from '@/lib/profissionais'
import type { ResponsavelSelecionado } from './BuscaResponsavel'

interface Props {
  /** Quando o paciente já existe, a rota vincula o responsável na hora. */
  pacienteId?: string
  onCriado: (responsavel: ResponsavelSelecionado, convite: DadosConvite) => void
  onConcluir: () => void
  onCancelar: () => void
}

const FORM_INICIAL = {
  nome: '',
  cpf_cnpj: '',
  telefone: '',
  email: '',
  cep: '',
  endereco: '',
  numero: '',
  complemento: '',
  bairro: '',
  cidade: '',
  estado: '',
}

const LABEL = { color: 'var(--color-ink-mid)' }

export function FormResponsavelInline({ pacienteId, onCriado, onConcluir, onCancelar }: Props) {
  const [form, setForm] = useState(FORM_INICIAL)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')
  const [criado, setCriado] = useState<{ nome: string; convite: DadosConvite; aviso: string | null } | null>(null)
  const campoCep = useCep({
    onEndereco: e => setForm(prev => ({
      ...prev,
      endereco: e.logradouro || prev.endereco,
      cidade: e.localidade || prev.cidade,
      bairro: e.bairro || prev.bairro,
      estado: e.uf || prev.estado,
    })),
  })

  function handle(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    // Este form vive num portal, mas o React faz o submit borbulhar pela árvore
    // de componentes: sem isto, dentro de <form> de paciente ele dispararia o
    // submit do paciente junto.
    e.stopPropagation()
    setErro('')

    if (!form.nome.trim()) {
      setErro('Informe o nome do responsável.')
      return
    }

    const erroCep = campoCep.validarParaSalvar(form.cep)
    if (erroCep) {
      setErro(erroCep)
      return
    }

    const telefone = validarTelefone(form.telefone)
    if (!telefone.valido) {
      setErro(telefone.mensagem)
      return
    }

    setCarregando(true)
    const res = await fetch('/api/admin/criar-usuario', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        role: 'pai',
        nome: form.nome,
        email: form.email,
        cpf_cnpj: form.cpf_cnpj,
        telefone: form.telefone,
        cep: form.cep,
        endereco: form.endereco,
        numero: form.numero,
        complemento: form.complemento || null,
        bairro: form.bairro || null,
        cidade: form.cidade,
        estado: form.estado || null,
        ...(pacienteId ? { paciente_id: pacienteId } : {}),
      }),
    })
    const json = await res.json().catch(() => ({}))
    setCarregando(false)

    // Conta criada mas vínculo com o paciente falhou: a rota devolve 500 com
    // user_id. Mostra o aviso e o link de acesso em vez de deixar recadastrar.
    const contaCriada = typeof json.user_id === 'string'
    if (!res.ok && !contaCriada) {
      setErro(json.error ?? 'Erro ao cadastrar responsável.')
      return
    }

    const convite: DadosConvite = {
      email: json.email ?? null,
      email_enviado: json.email_enviado === true,
      email_erro: json.email_erro ?? null,
      link_recuperacao: json.link_recuperacao ?? null,
    }
    const nome = json.nome || form.nome
    setCriado({ nome, convite, aviso: res.ok ? null : (json.error ?? null) })
    if (res.ok) onCriado({ id: json.user_id, nome }, convite)
  }

  if (criado) {
    return (
      <div className="space-y-4">
        {criado.aviso ? (
          <p className="text-sm" style={{ color: '#B91C1C' }}>
            <strong>{criado.nome}</strong>: {criado.aviso}
          </p>
        ) : (
          <p className="text-sm" style={LABEL}>
            <strong>{criado.nome}</strong> foi cadastrado{pacienteId ? ' e vinculado ao paciente' : ''}.
          </p>
        )}
        <StatusConvite
          convite={criado.convite}
          textoSemEmail="Cadastrado sem e-mail. Copie o link abaixo e envie por WhatsApp para definir a senha."
        />
        <Button type="button" onClick={onConcluir}>Concluir</Button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="block text-sm font-medium mb-1.5" style={LABEL}>
          Nome completo <span style={{ color: 'var(--color-rose-main)' }}>*</span>
        </label>
        <input name="nome" value={form.nome} onChange={handle} required placeholder="Nome do responsável" className="input-base" />
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium mb-1.5" style={LABEL}>Telefone</label>
          <CampoTelefone value={form.telefone} onChange={telefone => setForm(prev => ({ ...prev, telefone }))} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5" style={LABEL}>CPF</label>
          <input
            name="cpf_cnpj"
            value={form.cpf_cnpj}
            onChange={e => setForm(prev => ({ ...prev, cpf_cnpj: mascaraCpf(e.target.value) }))}
            placeholder="000.000.000-00"
            inputMode="numeric"
            maxLength={14}
            className="input-base"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1.5" style={LABEL}>
          E-mail <span className="text-xs font-normal" style={{ color: 'var(--color-ink-faint)' }}>(opcional)</span>
        </label>
        <input type="email" name="email" value={form.email} onChange={handle} placeholder="email@exemplo.com" className="input-base" />
        <p className="text-xs mt-1" style={{ color: 'var(--color-ink-faint)' }}>
          Sem e-mail, informe telefone ou CPF: é com eles que a pessoa entra. O link de acesso aparece ao salvar.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1.5" style={LABEL}>CEP</label>
        <input
          name="cep"
          value={form.cep}
          onChange={e => { setForm(prev => ({ ...prev, cep: mascaraCepDoEvento(e) })); campoCep.aoDigitar() }}
          onBlur={e => campoCep.aoSairDoCampo(e.target.value)}
          placeholder="00000-000"
          inputMode="numeric"
          className="input-base"
        />
        <AvisoCep aviso={campoCep.aviso} buscando={campoCep.buscando} />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1.5" style={LABEL}>Logradouro</label>
        <input name="endereco" value={form.endereco} onChange={handle} placeholder="Rua, Avenida..." className="input-base" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium mb-1.5" style={LABEL}>Número</label>
          <input name="numero" value={form.numero} onChange={handle} placeholder="123" className="input-base" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5" style={LABEL}>Complemento</label>
          <input name="complemento" value={form.complemento} onChange={handle} placeholder="Apto, Bloco..." className="input-base" />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1.5" style={LABEL}>Bairro</label>
        <input name="bairro" value={form.bairro} onChange={handle} placeholder="Bairro" className="input-base" />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2">
          <label className="block text-sm font-medium mb-1.5" style={LABEL}>Cidade</label>
          <input name="cidade" value={form.cidade} onChange={handle} placeholder="Cidade" className="input-base" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5" style={LABEL}>UF</label>
          <select name="estado" value={form.estado} onChange={handle} className="input-base">
            <option value="">—</option>
            {UFS_BRASIL.map(uf => <option key={uf} value={uf}>{uf}</option>)}
          </select>
        </div>
      </div>

      {erro && <p className="text-sm" style={{ color: '#B91C1C' }}>{erro}</p>}

      <div className="flex gap-3 pt-1">
        <Button type="submit" disabled={carregando}>
          {carregando ? 'Salvando...' : 'Cadastrar responsável'}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancelar} disabled={carregando}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}
