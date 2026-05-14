'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import {
  LABELS,
  gruposPorRole,
  todasPermissoes,
  type Permissao,
} from '@/lib/permissoes/definicoes'

interface Props {
  usuarioId: string
  role: string
  permissoesAtuais: Record<string, boolean>
}

function Toggle({
  checked,
  onChange,
  id,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  id: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      id={id}
      onClick={() => onChange(!checked)}
      className="relative inline-flex h-5 w-9 flex-shrink-0 rounded-full transition-colors duration-200 focus:outline-none"
      style={{
        background: checked ? 'var(--color-rose-main)' : 'var(--color-border)',
      }}
    >
      <span
        className="inline-block h-4 w-4 rounded-full bg-white shadow transition-transform duration-200 mt-0.5"
        style={{ transform: checked ? 'translateX(18px)' : 'translateX(2px)' }}
      />
    </button>
  )
}

export function PermissoesEditor({ usuarioId, role, permissoesAtuais }: Props) {
  const [estado, setEstado] = useState<Record<Permissao, boolean>>(
    () => todasPermissoes(role, permissoesAtuais)
  )
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [salvo, setSalvo] = useState(false)

  // Admin sempre tem tudo — editor é somente leitura
  const isAdmin = role === 'admin'

  function toggle(chave: Permissao, valor: boolean) {
    setEstado(prev => ({ ...prev, [chave]: valor }))
    setSalvo(false)
  }

  function restaurarPadrao() {
    setEstado(todasPermissoes(role, {}))
    setSalvo(false)
  }

  async function handleSalvar() {
    setErro('')
    setSalvando(true)
    const res = await fetch(`/api/admin/usuarios/${usuarioId}/permissoes`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ permissoes: estado }),
    })
    const json = await res.json()
    setSalvando(false)
    if (!res.ok) { setErro(json.error ?? 'Erro ao salvar.'); return }
    setSalvo(true)
  }

  const padraoRole = todasPermissoes(role, {})
  const grupos = gruposPorRole(role)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-base font-semibold" style={{ color: 'var(--color-ink-mid)' }}>
          Permissões
        </h2>
        {!isAdmin && (
          <button
            type="button"
            onClick={restaurarPadrao}
            className="text-xs transition-opacity hover:opacity-70"
            style={{ color: 'var(--color-ink-soft)' }}
          >
            Restaurar padrão do role
          </button>
        )}
      </div>

      {isAdmin && (
        <Card>
          <p className="text-sm" style={{ color: 'var(--color-ink-soft)' }}>
            Administradores têm todas as permissões permanentemente. Não é possível alterar.
          </p>
        </Card>
      )}

      {!isAdmin && grupos.map(grupo => (
        <Card key={grupo.titulo}>
          <h3
            className="text-xs font-semibold uppercase tracking-wider mb-3"
            style={{ color: 'var(--color-ink-soft)' }}
          >
            {grupo.titulo}
          </h3>
          <div className="space-y-3">
            {grupo.permissoes.map(chave => {
              const ehPadrao = estado[chave] === padraoRole[chave]
              return (
                <div key={chave} className="flex items-center justify-between gap-3">
                  <div className="flex-1">
                    <label
                      htmlFor={`perm-${chave}`}
                      className="text-sm cursor-pointer"
                      style={{ color: 'var(--color-ink-mid)' }}
                    >
                      {LABELS[chave]}
                    </label>
                    {!ehPadrao && (
                      <span
                        className="ml-2 text-xs px-1.5 py-0.5 rounded-full"
                        style={{ background: 'var(--color-rose-blush)', color: 'var(--color-rose-main)' }}
                      >
                        override
                      </span>
                    )}
                  </div>
                  <Toggle
                    id={`perm-${chave}`}
                    checked={estado[chave]}
                    onChange={v => toggle(chave, v)}
                  />
                </div>
              )
            })}
          </div>
        </Card>
      ))}

      {!isAdmin && (
        <div className="flex items-center gap-3">
          <Button onClick={handleSalvar} disabled={salvando}>
            {salvando ? 'Salvando...' : 'Salvar permissões'}
          </Button>
          {salvo && (
            <span className="text-sm" style={{ color: 'var(--color-sage-deep)' }}>
              Salvo com sucesso.
            </span>
          )}
          {erro && (
            <span className="text-sm" style={{ color: '#B91C1C' }}>{erro}</span>
          )}
        </div>
      )}
    </div>
  )
}
