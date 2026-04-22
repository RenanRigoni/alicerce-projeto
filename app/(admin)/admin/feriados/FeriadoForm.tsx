'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

export function FeriadoForm() {
  const router = useRouter()
  const [aberto, setAberto] = useState(false)
  const [data, setData] = useState('')
  const [descricao, setDescricao] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  async function handleSalvar() {
    if (!data || !descricao.trim()) { setErro('Preencha a data e a descrição.'); return }
    setErro('')
    setSalvando(true)

    const res = await fetch('/api/feriado', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data, descricao }),
    })

    const json = await res.json()
    setSalvando(false)

    if (!res.ok) {
      setErro(json.error ?? 'Erro ao salvar.')
      return
    }

    setData('')
    setDescricao('')
    setAberto(false)
    router.refresh()
  }

  if (!aberto) {
    return (
      <button
        onClick={() => setAberto(true)}
        className="text-sm font-medium px-4 py-2 rounded-xl text-white transition-all duration-200 active:scale-[0.98]"
        style={{ background: 'var(--color-rose-main)' }}
      >
        + Adicionar feriado
      </button>
    )
  }

  return (
    <Card>
      <div className="space-y-3">
        <h2 className="text-sm font-semibold" style={{ color: 'var(--color-ink-mid)' }}>
          Novo feriado
        </h2>
        <input
          type="date"
          value={data}
          onChange={e => setData(e.target.value)}
          className="input-base"
        />
        <input
          value={descricao}
          onChange={e => setDescricao(e.target.value)}
          placeholder="Ex: Dia do Trabalho, Natal, Carnaval..."
          className="input-base"
        />
        {erro && <p className="text-sm" style={{ color: '#B91C1C' }}>{erro}</p>}
        <div className="flex gap-3">
          <Button onClick={handleSalvar} disabled={salvando}>{salvando ? 'Salvando...' : 'Salvar'}</Button>
          <Button variant="ghost" onClick={() => { setAberto(false); setErro('') }}>Cancelar</Button>
        </div>
      </div>
    </Card>
  )
}
