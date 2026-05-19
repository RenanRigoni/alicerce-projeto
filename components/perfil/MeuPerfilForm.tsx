'use client'

import { useState, useTransition } from 'react'
import { salvarMeuPerfil } from '@/lib/actions/perfil-actions'
import { Loader2, Pencil, X, Lock } from 'lucide-react'

interface Props {
  nome: string
  email: string | null
  telefone: string | null
  cpf: string | null
  role: string
  criadoEm: string
}

const roleLabel: Record<string, string> = {
  admin:     'Administrador',
  recepcao:  'Recepção',
  terapeuta: 'Profissional',
  pai:       'Família',
}

function formatarCpf(valor?: string | null) {
  const d = valor?.replace(/\D/g, '') ?? ''
  if (d.length === 11) return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9)}`
  if (d.length === 14) return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8,12)}-${d.slice(12)}`
  return valor ?? null
}

export function MeuPerfilForm({ nome, email, telefone, cpf, role, criadoEm }: Props) {
  const [editando, setEditando] = useState(false)
  const [nomeVal, setNomeVal] = useState(nome)
  const [telVal, setTelVal] = useState(telefone ?? '')
  const [toast, setToast] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  function cancelar() {
    setNomeVal(nome)
    setTelVal(telefone ?? '')
    setEditando(false)
  }

  function salvar() {
    startTransition(async () => {
      try {
        const fd = new FormData()
        fd.append('nome', nomeVal)
        fd.append('telefone', telVal)
        await salvarMeuPerfil(fd)
        showToast('Dados atualizados!')
        setEditando(false)
      } catch {
        showToast('Erro ao salvar. Tente novamente.')
      }
    })
  }

  const cpfFormatado = formatarCpf(cpf)
  const dataCriacao = new Date(criadoEm).toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'long', year: 'numeric',
  })

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ border: '1px solid var(--color-border-soft)', background: 'var(--color-warm-white)' }}
    >
      {/* Header */}
      <div
        className="px-6 py-4 flex items-center justify-between"
        style={{ borderBottom: '1px solid var(--color-border-soft)' }}
      >
        <h2 className="text-sm font-semibold" style={{ color: 'var(--color-ink)' }}>
          Informações
        </h2>
        {!editando && (
          <button
            onClick={() => setEditando(true)}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors hover:opacity-80"
            style={{ color: 'var(--color-rose-main)', background: 'var(--color-rose-blush)' }}
          >
            <Pencil size={13} />
            Editar informações
          </button>
        )}
      </div>

      {/* Fields */}
      <div className="divide-y" style={{ borderColor: 'var(--color-border-soft)' }}>
        {/* Nome */}
        <div className="px-6 py-4">
          <div className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--color-ink-faint)' }}>
            Nome completo
          </div>
          {editando ? (
            <input
              value={nomeVal}
              onChange={e => setNomeVal(e.target.value)}
              className="w-full text-sm rounded-xl px-3 py-2 outline-none transition-colors"
              style={{
                border: '1.5px solid var(--color-rose-main)',
                background: 'var(--color-cream)',
                color: 'var(--color-ink)',
              }}
            />
          ) : (
            <div className="text-sm" style={{ color: 'var(--color-ink)' }}>{nomeVal || '—'}</div>
          )}
        </div>

        {/* Email */}
        <div className="px-6 py-4 flex items-start justify-between">
          <div>
            <div className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--color-ink-faint)' }}>
              E-mail
            </div>
            <div className="text-sm" style={{ color: 'var(--color-ink)' }}>{email || '—'}</div>
          </div>
          <Lock size={13} style={{ color: 'var(--color-ink-faint)', marginTop: 2 }} />
        </div>

        {/* Telefone */}
        <div className="px-6 py-4">
          <div className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--color-ink-faint)' }}>
            Telefone
          </div>
          {editando ? (
            <input
              value={telVal}
              onChange={e => setTelVal(e.target.value)}
              placeholder="(00) 00000-0000"
              className="w-full text-sm rounded-xl px-3 py-2 outline-none transition-colors"
              style={{
                border: '1.5px solid var(--color-rose-main)',
                background: 'var(--color-cream)',
                color: 'var(--color-ink)',
              }}
            />
          ) : (
            <div className="text-sm" style={{ color: telVal ? 'var(--color-ink)' : 'var(--color-ink-faint)' }}>
              {telVal || 'Não informado'}
            </div>
          )}
        </div>

        {/* CPF */}
        {cpfFormatado && (
          <div className="px-6 py-4 flex items-start justify-between">
            <div>
              <div className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--color-ink-faint)' }}>
                CPF
              </div>
              <div className="text-sm" style={{ color: 'var(--color-ink)' }}>{cpfFormatado}</div>
            </div>
            <Lock size={13} style={{ color: 'var(--color-ink-faint)', marginTop: 2 }} />
          </div>
        )}

        {/* Cargo */}
        <div className="px-6 py-4 flex items-start justify-between">
          <div>
            <div className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--color-ink-faint)' }}>
              Cargo
            </div>
            <div className="text-sm" style={{ color: 'var(--color-ink)' }}>{roleLabel[role] ?? role}</div>
          </div>
          <Lock size={13} style={{ color: 'var(--color-ink-faint)', marginTop: 2 }} />
        </div>

        {/* Cadastrado em */}
        <div className="px-6 py-4">
          <div className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--color-ink-faint)' }}>
            Cadastrado em
          </div>
          <div className="text-sm" style={{ color: 'var(--color-ink)' }}>{dataCriacao}</div>
        </div>
      </div>

      {/* Edit actions */}
      {editando && (
        <div
          className="px-6 py-4 flex items-center gap-3"
          style={{ borderTop: '1px solid var(--color-border-soft)' }}
        >
          <button
            onClick={salvar}
            disabled={isPending}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-opacity disabled:opacity-60"
            style={{ background: 'var(--color-rose-main)', color: '#fff' }}
          >
            {isPending && <Loader2 size={14} className="animate-spin" />}
            Salvar
          </button>
          <button
            onClick={cancelar}
            disabled={isPending}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm transition-colors hover:opacity-70"
            style={{ color: 'var(--color-ink-mid)' }}
          >
            <X size={14} />
            Cancelar
          </button>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 px-5 py-3 rounded-2xl text-sm font-medium shadow-lg z-[9999]"
          style={{ background: 'var(--color-ink)', color: '#fff' }}
        >
          {toast}
        </div>
      )}
    </div>
  )
}
