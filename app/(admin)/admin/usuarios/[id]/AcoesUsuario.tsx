'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { StatusConvite, type DadosConvite } from '@/components/admin/StatusConvite'
import { Button } from '@/components/ui/Button'

interface Props {
  usuarioId: string
  ativo: boolean
  isAdmin: boolean
  isRecepcao: boolean
  targetRole: string
  isSelf: boolean
  podeAlterarStatus: boolean
  podeReenviarAcesso: boolean
}

export function AcoesUsuario({ usuarioId, ativo, isAdmin, isRecepcao, targetRole, isSelf, podeAlterarStatus, podeReenviarAcesso }: Props) {
  // Recepção só pode toggle responsáveis (pais). Admin pode tudo.
  const podeToggleAtivo = podeAlterarStatus && (isAdmin || (isRecepcao && targetRole === 'pai'))
  const router = useRouter()
  const [carregando, setCarregando] = useState(false)
  const [confirmandoDelete, setConfirmandoDelete] = useState(false)
  const [erro, setErro] = useState('')
  const [reenviando, setReenviando] = useState<'email' | 'link' | null>(null)
  const [convite, setConvite] = useState<DadosConvite | null>(null)

  async function reenviarAcesso(modo: 'email' | 'link') {
    setErro('')
    setConvite(null)
    setReenviando(modo)
    const res = await fetch('/api/admin/reenviar-acesso', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuario_id: usuarioId, modo }),
    })
    const json = await res.json()
    setReenviando(null)
    if (!res.ok) { setErro(json.error ?? 'Não foi possível reenviar o acesso.'); return }
    setConvite({
      email: json.email ?? null,
      email_enviado: json.email_enviado === true,
      email_erro: json.email_erro ?? null,
      link_recuperacao: json.link_recuperacao ?? null,
    })
  }

  async function toggleAtivo() {
    setErro('')
    setCarregando(true)
    const res = await fetch(`/api/usuario/${usuarioId}/ativo`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ativo: !ativo }),
    })
    const json = await res.json()
    setCarregando(false)
    if (!res.ok) { setErro(json.error ?? 'Erro.'); return }
    router.refresh()
  }

  async function deletarUsuario() {
    setErro('')
    setCarregando(true)
    const res = await fetch(`/api/usuario/${usuarioId}`, { method: 'DELETE' })
    const json = await res.json()
    setCarregando(false)
    if (!res.ok) { setErro(json.error ?? 'Erro.'); return }
    router.push('/admin/usuarios')
  }

  if (isSelf) return null
  if (!podeToggleAtivo && !isAdmin && !podeReenviarAcesso) return null

  return (
    <div className="space-y-3">
      {erro && (
        <p className="text-sm" style={{ color: '#B91C1C' }}>{erro}</p>
      )}

      {convite && <StatusConvite convite={convite} />}

      <div className="flex flex-wrap gap-3">
        {podeReenviarAcesso && (
          <>
            <Button
              variant="ghost"
              onClick={() => reenviarAcesso('email')}
              disabled={reenviando !== null}
            >
              {reenviando === 'email' ? 'Enviando...' : 'Reenviar acesso por e-mail'}
            </Button>
            <Button
              variant="ghost"
              onClick={() => reenviarAcesso('link')}
              disabled={reenviando !== null}
            >
              {reenviando === 'link' ? 'Gerando...' : 'Gerar link de senha'}
            </Button>
          </>
        )}

        {podeToggleAtivo && (
          <Button
            variant="ghost"
            onClick={toggleAtivo}
            disabled={carregando}
          >
            {carregando ? 'Processando...' : ativo ? 'Desativar acesso' : 'Reativar acesso'}
          </Button>
        )}

        {isAdmin && (
          !confirmandoDelete ? (
            <button
              onClick={() => setConfirmandoDelete(true)}
              className="text-sm font-medium px-4 py-2 rounded-xl transition-all duration-200"
              style={{
                border: '1px solid #FECACA',
                color: '#B91C1C',
                background: 'transparent',
              }}
            >
              Deletar usuário
            </button>
          ) : (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium" style={{ color: '#B91C1C' }}>
                Confirmar deleção permanente?
              </span>
              <button
                onClick={deletarUsuario}
                disabled={carregando}
                className="text-sm font-medium px-3 py-1.5 rounded-lg text-white transition-colors disabled:opacity-50"
                style={{ background: '#DC2626' }}
              >
                {carregando ? 'Deletando...' : 'Sim, deletar'}
              </button>
              <button
                onClick={() => setConfirmandoDelete(false)}
                className="text-sm px-2 py-1.5 transition-colors"
                style={{ color: 'var(--color-ink-soft)' }}
              >
                Cancelar
              </button>
            </div>
          )
        )}
      </div>
    </div>
  )
}
