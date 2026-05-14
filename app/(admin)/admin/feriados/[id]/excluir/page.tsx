'use client'

import { useRouter, useParams } from 'next/navigation'
import { useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

export default function ExcluirFeriadoPage() {
  const router = useRouter()
  const params = useParams()
  const feriadoId = params.id as string
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')

  async function handleExcluir() {
    setCarregando(true)
    setErro('')
    const res = await fetch('/api/feriado', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: feriadoId }),
    })
    setCarregando(false)
    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      setErro(json.error ?? 'Erro ao excluir feriado.')
      return
    }
    router.push('/admin/feriados')
  }

  return (
    <div className="max-w-md space-y-6">
      <a
        href="/admin/feriados"
        className="text-sm transition-colors hover:opacity-70"
        style={{ color: 'var(--color-ink-soft)' }}
      >
        ← Voltar
      </a>
      <Card>
        <p className="text-sm mb-4" style={{ color: 'var(--color-ink-mid)' }}>
          Confirma a exclusão deste feriado? A data voltará a aparecer normalmente na agenda.
        </p>
        {erro && <p className="text-sm mb-4" style={{ color: '#B91C1C' }}>{erro}</p>}
        <div className="flex gap-3">
          <Button onClick={handleExcluir} disabled={carregando}>
            {carregando ? 'Excluindo...' : 'Confirmar exclusão'}
          </Button>
          <Button variant="ghost" onClick={() => router.push('/admin/feriados')}>
            Cancelar
          </Button>
        </div>
      </Card>
    </div>
  )
}
