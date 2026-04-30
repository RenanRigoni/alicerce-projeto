'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  pacienteId: string
  pacienteNome: string
}

const labelStyle = { color: 'var(--color-ink-mid)' }

export function RegistrarAltaButton({ pacienteId, pacienteNome }: Props) {
  const router = useRouter()
  const [modalAberto, setModalAberto] = useState(false)
  const [form, setForm] = useState({
    justificativa: '',
    evolucao: '',
    detalhes_clinicos: '',
    obs_adicionais: '',
  })
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')

  function handle(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  function fechar() {
    setModalAberto(false)
    setErro('')
    setForm({ justificativa: '', evolucao: '', detalhes_clinicos: '', obs_adicionais: '' })
  }

  async function handleRegistrar() {
    if (!form.justificativa.trim()) { setErro('A justificativa é obrigatória.'); return }
    setErro('')
    setEnviando(true)

    const partes = [
      `[Justificativa]\n${form.justificativa.trim()}`,
      form.evolucao.trim() ? `[Evolução do paciente]\n${form.evolucao.trim()}` : '',
      form.detalhes_clinicos.trim() ? `[Detalhes clínicos]\n${form.detalhes_clinicos.trim()}` : '',
      form.obs_adicionais.trim() ? `[Observações adicionais]\n${form.obs_adicionais.trim()}` : '',
    ].filter(Boolean)

    const res = await fetch('/api/alta/registrar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paciente_id: pacienteId, motivo: partes.join('\n\n') }),
    })

    const json = await res.json()
    setEnviando(false)

    if (!res.ok) { setErro(json.error ?? 'Erro ao registrar alta.'); return }

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
        Registrar alta
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
                Registrar alta — {pacienteNome}
              </h2>
              <p className="text-sm mt-1" style={{ color: 'var(--color-ink-soft)' }}>
                A alta será registrada imediatamente e a família será notificada.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5" style={labelStyle}>
                Justificativa <span style={{ color: 'var(--color-rose-main)' }}>*</span>
              </label>
              <textarea
                name="justificativa"
                value={form.justificativa}
                onChange={handle}
                rows={3}
                placeholder="Motivo principal para a alta..."
                className="input-base resize-y"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5" style={labelStyle}>
                Evolução do paciente
              </label>
              <textarea
                name="evolucao"
                value={form.evolucao}
                onChange={handle}
                rows={3}
                placeholder="Descreva a evolução observada ao longo do tratamento..."
                className="input-base resize-y"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5" style={labelStyle}>
                Detalhes clínicos
              </label>
              <textarea
                name="detalhes_clinicos"
                value={form.detalhes_clinicos}
                onChange={handle}
                rows={2}
                placeholder="Informações clínicas relevantes..."
                className="input-base resize-y"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5" style={labelStyle}>
                Observações adicionais
              </label>
              <textarea
                name="obs_adicionais"
                value={form.obs_adicionais}
                onChange={handle}
                rows={2}
                placeholder="Outras informações complementares (opcional)..."
                className="input-base resize-y"
              />
            </div>

            {erro && <p className="text-sm" style={{ color: '#B91C1C' }}>{erro}</p>}

            <div className="flex gap-3 pt-1">
              <button
                onClick={handleRegistrar}
                disabled={enviando}
                className="flex-1 text-sm font-medium px-4 py-2 rounded-xl text-white transition-colors disabled:opacity-50"
                style={{ background: '#D97706' }}
              >
                {enviando ? 'Registrando...' : 'Confirmar alta'}
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
