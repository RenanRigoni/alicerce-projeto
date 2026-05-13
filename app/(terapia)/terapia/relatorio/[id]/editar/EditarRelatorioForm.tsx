'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

interface Relatorio {
  id: string
  paciente_id: string
  identificacao: string | null
  conclusao: string | null
  obs_clinicas: string | null
  pdf_url: string | null
  status: string
}

export function EditarRelatorioForm({
  relatorio,
  tipo = 'relatorio',
}: {
  relatorio: Relatorio
  tipo?: 'relatorio' | 'evolucao'
}) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const apiSegment = tipo === 'evolucao' ? 'evolucao' : 'relatorio'

  const [titulo, setTitulo] = useState(relatorio.identificacao ?? '')
  const [previa, setPrevia] = useState(relatorio.conclusao ?? '')
  const [adicionais, setAdicionais] = useState(relatorio.obs_clinicas ?? '')
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  async function uploadPdf(): Promise<string | null> {
    if (!arquivo) return null
    const formData = new FormData()
    formData.append('arquivo', arquivo)
    formData.append('paciente_id', relatorio.paciente_id)
    const res = await fetch('/api/upload/relatorio-pdf', { method: 'POST', body: formData })
    if (!res.ok) return null
    const json = await res.json()
    return json.path ?? null
  }

  async function handleSalvar() {
    if (!titulo.trim()) { setErro('Título é obrigatório.'); return }
    setErro('')
    setSalvando(true)

    let pdfUrl: string | undefined = undefined
    if (arquivo) {
      const url = await uploadPdf()
      if (url === null) { setErro('Erro ao enviar arquivo.'); setSalvando(false); return }
      pdfUrl = url
    }

    const body: Record<string, any> = {
      identificacao: titulo.trim(),
      conclusao: previa.trim() || null,
      obs_clinicas: adicionais.trim() || null,
    }
    if (pdfUrl !== undefined) body.pdf_url = pdfUrl

    const res = await fetch(`/api/${apiSegment}/${relatorio.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    setSalvando(false)
    if (!res.ok) { const j = await res.json(); setErro(j.error ?? 'Erro ao salvar.'); return }
    router.push(`/terapia/paciente/${relatorio.paciente_id}`)
  }

  const labelStyle = { color: 'var(--color-ink-mid)' }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <a href={`/terapia/paciente/${relatorio.paciente_id}`} className="text-sm transition-colors hover:opacity-70" style={{ color: 'var(--color-ink-soft)' }}>
          ← Voltar
        </a>
        <h1 className="text-2xl font-semibold" style={{ fontFamily: 'var(--font-lora)', color: 'var(--color-ink)' }}>
          Editar rascunho
        </h1>
      </div>

      <Card>
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium mb-1.5" style={labelStyle}>
              Título <span style={{ color: 'var(--color-rose-main)' }}>*</span>
            </label>
            <input
              value={titulo}
              onChange={e => setTitulo(e.target.value)}
              placeholder={tipo === 'evolucao' ? 'Ex: Evolucao de acompanhamento' : 'Ex: Relatório de avaliação - 1º semestre 2025'}
              className="input-base"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5" style={labelStyle}>
              Substituir PDF {relatorio.pdf_url ? '(opcional)' : ''}
            </label>
            <input ref={inputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={e => setArquivo(e.target.files?.[0] ?? null)} className="hidden" />
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="w-full rounded-xl px-4 py-5 text-sm text-center transition-colors"
              style={{
                border: arquivo ? '2px dashed var(--color-rose-soft)' : '2px dashed var(--color-border)',
                color: arquivo ? 'var(--color-rose-main)' : 'var(--color-ink-faint)',
                background: 'transparent',
              }}
            >
              {arquivo ? `✓ ${arquivo.name}` : relatorio.pdf_url ? 'Clique para substituir o PDF atual' : 'Clique para anexar PDF'}
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5" style={labelStyle}>Prévia</label>
            <textarea
              value={previa}
              onChange={e => setPrevia(e.target.value)}
              rows={3}
              placeholder={tipo === 'evolucao' ? 'Resumo breve da evolucao...' : 'Resumo breve do relatório...'}
              className="input-base resize-y"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5" style={labelStyle}>Observações adicionais</label>
            <textarea
              value={adicionais}
              onChange={e => setAdicionais(e.target.value)}
              rows={2}
              placeholder="Anotações complementares (opcional)"
              className="input-base resize-y"
            />
          </div>

          {erro && <p className="text-sm" style={{ color: '#B91C1C' }}>{erro}</p>}

          <div className="flex gap-3 pt-2">
            <Button type="button" onClick={handleSalvar} disabled={salvando}>
              {salvando ? 'Salvando...' : 'Salvar alterações'}
            </Button>
            <Button variant="ghost" type="button" onClick={() => router.push(`/terapia/paciente/${relatorio.paciente_id}`)}>
              Cancelar
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
