'use client'

import { useRouter, useParams } from 'next/navigation'
import { useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

export default function DesativarPacientePage() {
  const router = useRouter()
  const params = useParams()
  const pacienteId = params.id as string
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')
  const [motivo, setMotivo] = useState('')

  async function handleDesativar() {
    setErro('')
    setCarregando(true)
    const res = await fetch(`/api/paciente/${pacienteId}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'desativado', motivo_desativacao: motivo }),
    })
    const json = await res.json()
    setCarregando(false)
    if (!res.ok) { setErro(json.error ?? 'Erro.'); return }
    router.push(`/admin/pacientes/${pacienteId}`)
  }

  return (
    <div className="max-w-md space-y-6">
      <div className="flex items-center gap-3">
        <a
          href={`/admin/pacientes/${pacienteId}`}
          className="text-sm transition-colors hover:opacity-70"
          style={{ color: 'var(--color-ink-soft)' }}
        >
          ← Voltar
        </a>
        <h1
          className="text-2xl font-semibold"
          style={{ fontFamily: 'var(--font-lora)', color: 'var(--color-ink)' }}
        >
          Desativar paciente
        </h1>
      </div>
      <Card>
        <p className="text-sm mb-4" style={{ color: 'var(--color-ink-mid)' }}>
          O paciente será marcado como <strong>desativado</strong>. Não é uma alta terapêutica formal — use a opção de solicitação de alta para isso.
        </p>
        <div className="mb-4">
          <label
            className="block text-sm font-medium mb-1.5"
            style={{ color: 'var(--color-ink-mid)' }}
          >
            Motivo (opcional)
          </label>
          <textarea
            value={motivo}
            onChange={e => setMotivo(e.target.value)}
            rows={3}
            placeholder="Ex: família solicitou pausa no tratamento..."
            className="input-base resize-y"
          />
        </div>
        {erro && (
          <p className="text-sm mb-2" style={{ color: '#B91C1C' }}>{erro}</p>
        )}
        <div className="flex gap-3">
          <Button onClick={handleDesativar} disabled={carregando}>
            {carregando ? 'Processando...' : 'Confirmar desativação'}
          </Button>
          <Button variant="ghost" onClick={() => router.push(`/admin/pacientes/${pacienteId}`)}>
            Cancelar
          </Button>
        </div>
      </Card>
    </div>
  )
}
