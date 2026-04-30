'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  pacienteId: string
  pacienteNome: string
}

const labelStyle = { color: 'var(--color-ink-mid)' }

export function SolicitarAltaPortal({ pacienteId, pacienteNome }: Props) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [modalAberto, setModalAberto] = useState(false)
  const [motivo, setMotivo] = useState('')
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')

  function fechar() {
    setModalAberto(false)
    setErro('')
    setMotivo('')
    setArquivo(null)
  }

  async function uploadDocumento(): Promise<string | null> {
    if (!arquivo) return null

    const formData = new FormData()
    formData.append('arquivo', arquivo)
    formData.append('paciente_id', pacienteId)
    formData.append('tipo', 'encaminhamento')
    formData.append('descricao', 'Solicitação médica de alta')
    formData.append('visivel_pais', 'true')

    const res = await fetch('/api/documento/upload', { method: 'POST', body: formData })
    if (!res.ok) return null
    const json = await res.json()
    return json.url ?? null
  }

  async function handleSolicitar() {
    if (!motivo.trim()) { setErro('Descreva o motivo da solicitação.'); return }
    setErro('')
    setEnviando(true)

    const documentoUrl = await uploadDocumento()

    const res = await fetch('/api/alta/solicitar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paciente_id: pacienteId, motivo: motivo.trim(), documento_url: documentoUrl }),
    })

    const json = await res.json()
    setEnviando(false)

    if (!res.ok) { setErro(json.error ?? 'Erro ao enviar solicitação.'); return }

    fechar()
    router.refresh()
  }

  return (
    <>
      <button
        onClick={() => setModalAberto(true)}
        className="text-sm font-medium px-4 py-2 rounded-xl transition-all duration-200"
        style={{ border: '1px solid #FDE68A', color: '#92400E', background: '#FFFBEB' }}
      >
        Solicitar alta
      </button>

      {modalAberto && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 px-4 py-6 overflow-y-auto"
          style={{ background: 'rgba(44,32,24,0.4)' }}
        >
          <div
            className="rounded-2xl p-6 w-full max-w-lg space-y-4 my-auto"
            style={{ background: 'var(--color-warm-white)', boxShadow: '0 20px 60px rgba(44,32,24,0.2)' }}
          >
            <div>
              <h2 className="text-base font-semibold" style={{ fontFamily: 'var(--font-lora)', color: 'var(--color-ink)' }}>
                Solicitar alta — {pacienteNome}
              </h2>
              <p className="text-sm mt-1" style={{ color: 'var(--color-ink-soft)' }}>
                A terapeuta receberá sua solicitação e confirmará a alta em breve.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5" style={labelStyle}>
                Motivo da solicitação <span style={{ color: 'var(--color-rose-main)' }}>*</span>
              </label>
              <textarea
                value={motivo}
                onChange={e => setMotivo(e.target.value)}
                rows={4}
                placeholder="Descreva o motivo pelo qual está solicitando a alta..."
                className="input-base resize-y"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5" style={labelStyle}>
                Documento médico (opcional)
              </label>
              <input
                ref={inputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={e => setArquivo(e.target.files?.[0] ?? null)}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="w-full rounded-xl px-4 py-4 text-sm text-center transition-colors"
                style={{
                  border: arquivo ? '2px dashed var(--color-rose-soft)' : '2px dashed var(--color-border)',
                  color: arquivo ? 'var(--color-rose-main)' : 'var(--color-ink-faint)',
                  background: 'transparent',
                }}
              >
                {arquivo ? `✓ ${arquivo.name}` : 'Anexar solicitação médica (PDF ou imagem)'}
              </button>
              <p className="text-xs mt-1" style={{ color: 'var(--color-ink-faint)' }}>
                Se um médico solicitou a alta, anexe o documento aqui.
              </p>
            </div>

            {erro && <p className="text-sm" style={{ color: '#B91C1C' }}>{erro}</p>}

            <div className="flex gap-3 pt-1">
              <button
                onClick={handleSolicitar}
                disabled={enviando}
                className="flex-1 text-sm font-medium px-4 py-2 rounded-xl text-white transition-colors disabled:opacity-50"
                style={{ background: '#D97706' }}
              >
                {enviando ? 'Enviando...' : 'Enviar solicitação'}
              </button>
              <button
                onClick={fechar}
                className="text-sm px-4 py-2 transition-colors rounded-xl"
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
