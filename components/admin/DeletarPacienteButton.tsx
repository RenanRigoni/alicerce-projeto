'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  pacienteId: string
  pacienteNome: string
}

export function DeletarPacienteButton({ pacienteId, pacienteNome }: Props) {
  const router = useRouter()
  const [modalAberto, setModalAberto] = useState(false)
  const [confirmacao, setConfirmacao] = useState('')
  const [deletando, setDeletando] = useState(false)
  const [erro, setErro] = useState('')

  async function handleDeletar() {
    if (confirmacao.trim().toLowerCase() !== pacienteNome.trim().toLowerCase()) {
      setErro('O nome digitado não corresponde ao nome do paciente.')
      return
    }

    setErro('')
    setDeletando(true)

    const res = await fetch(`/api/paciente/${pacienteId}/deletar`, {
      method: 'DELETE',
    })

    const json = await res.json()
    setDeletando(false)

    if (!res.ok) {
      setErro(json.error ?? 'Erro ao excluir paciente.')
      return
    }

    router.push('/admin/pacientes')
  }

  function fecharModal() {
    setModalAberto(false)
    setConfirmacao('')
    setErro('')
  }

  return (
    <>
      <button
        onClick={() => setModalAberto(true)}
        className="text-sm font-medium px-4 py-2 rounded-xl transition-all duration-200"
        style={{
          background: '#FEF2F2',
          color: '#B91C1C',
          border: '1px solid #FECACA',
        }}
      >
        Excluir paciente
      </button>

      {modalAberto && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 px-4"
          style={{ background: 'rgba(44,32,24,0.4)' }}
        >
          <div
            className="rounded-2xl p-6 w-full max-w-sm space-y-4"
            style={{
              background: 'var(--color-warm-white)',
              boxShadow: '0 20px 60px rgba(44,32,24,0.2)',
            }}
          >
            <div className="space-y-1">
              <h2
                className="text-base font-semibold"
                style={{ fontFamily: 'var(--font-lora)', color: 'var(--color-ink)' }}
              >
                Excluir paciente permanentemente
              </h2>
              <p className="text-sm" style={{ color: 'var(--color-ink-soft)' }}>
                Esta ação é <strong>irreversível</strong>. Todos os dados do paciente serão excluídos — relatórios, documentos, orientações e histórico.
              </p>
            </div>

            <div
              className="rounded-xl px-3 py-2 text-sm font-medium"
              style={{ background: '#FEF2F2', color: '#B91C1C', border: '1px solid #FECACA' }}
            >
              {pacienteNome}
            </div>

            <div>
              <label
                className="block text-sm font-medium mb-1.5"
                style={{ color: 'var(--color-ink-mid)' }}
              >
                Digite o nome do paciente para confirmar:
              </label>
              <input
                value={confirmacao}
                onChange={e => setConfirmacao(e.target.value)}
                className="input-base"
                placeholder="Nome completo do paciente"
                autoFocus
              />
            </div>

            {erro && (
              <p className="text-sm" style={{ color: '#B91C1C' }}>{erro}</p>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleDeletar}
                disabled={deletando}
                className="flex-1 text-sm font-medium px-4 py-2 rounded-xl text-white transition-colors disabled:opacity-50"
                style={{ background: '#DC2626' }}
              >
                {deletando ? 'Excluindo...' : 'Confirmar exclusão'}
              </button>
              <button
                onClick={fecharModal}
                disabled={deletando}
                className="text-sm px-4 py-2 transition-opacity hover:opacity-70"
                style={{ color: 'var(--color-ink-soft)' }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
