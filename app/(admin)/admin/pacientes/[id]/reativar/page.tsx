'use client'

import { useRouter, useParams } from 'next/navigation'
import { useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

export default function ReativarPacientePage() {
  const router = useRouter()
  const params = useParams()
  const pacienteId = params.id as string
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')

  async function handleReativar() {
    setErro('')
    setCarregando(true)
    const res = await fetch(`/api/paciente/${pacienteId}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'ativo' }),
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
          Reativar paciente
        </h1>
      </div>
      <Card>
        <p className="text-sm mb-4" style={{ color: 'var(--color-ink-mid)' }}>
          O paciente voltará ao status <strong>ativo</strong> e poderá receber agendamentos e atualizações normalmente.
        </p>
        {erro && (
          <p className="text-sm mb-2" style={{ color: '#B91C1C' }}>{erro}</p>
        )}
        <div className="flex gap-3">
          <Button onClick={handleReativar} disabled={carregando}>
            {carregando ? 'Processando...' : 'Confirmar reativação'}
          </Button>
          <Button variant="ghost" onClick={() => router.push(`/admin/pacientes/${pacienteId}`)}>
            Cancelar
          </Button>
        </div>
      </Card>
    </div>
  )
}
