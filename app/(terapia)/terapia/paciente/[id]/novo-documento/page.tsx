'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

export default function NovoDocumentoPage() {
  const router = useRouter()
  const params = useParams()
  const pacienteId = params.id as string

  const [tipo, setTipo] = useState('foto')
  const [descricao, setDescricao] = useState('')
  const [visivelPais, setVisivelPais] = useState(true)
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!arquivo) { setErro('Selecione um arquivo.'); return }
    setErro('')
    setEnviando(true)

    const formData = new FormData()
    formData.append('arquivo', arquivo)
    formData.append('paciente_id', pacienteId)
    formData.append('tipo', tipo)
    if (descricao) formData.append('descricao', descricao)
    formData.append('visivel_pais', visivelPais ? 'true' : 'false')

    const res = await fetch('/api/documento/upload', { method: 'POST', body: formData })
    const json = await res.json()
    setEnviando(false)

    if (!res.ok) {
      setErro(json.error ?? 'Erro ao enviar arquivo.')
      return
    }
    router.push(`/terapia/paciente/${pacienteId}`)
  }

  const labelStyle = { color: 'var(--color-ink-mid)' }

  return (
    <div className="space-y-6 max-w-xl">
      <div className="flex items-center gap-3">
        <a href={`/terapia/paciente/${pacienteId}`} className="text-sm transition-colors hover:opacity-70" style={{ color: 'var(--color-ink-soft)' }}>
          ← Voltar
        </a>
        <h1 className="text-2xl font-semibold" style={{ fontFamily: 'var(--font-lora)', color: 'var(--color-ink)' }}>
          Anexar documento
        </h1>
      </div>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5" style={labelStyle}>Tipo</label>
            <select value={tipo} onChange={e => setTipo(e.target.value)} className="input-base">
              <option value="foto">Foto</option>
              <option value="pdf">PDF</option>
              <option value="video">Vídeo</option>
              <option value="outro">Outro</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5" style={labelStyle}>
              Arquivo <span style={{ color: 'var(--color-rose-main)' }}>*</span>
            </label>
            <input
              type="file"
              accept="image/*,video/*,.pdf,.doc,.docx"
              onChange={e => setArquivo(e.target.files?.[0] ?? null)}
              required
              className="input-base"
            />
            <p className="text-xs mt-1" style={{ color: 'var(--color-ink-faint)' }}>
              PDF, imagem, vídeo ou Word — máx. 15 MB
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5" style={labelStyle}>Descrição</label>
            <input value={descricao} onChange={e => setDescricao(e.target.value)} className="input-base" placeholder="Breve descrição do arquivo (opcional)" />
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={visivelPais}
              onChange={e => setVisivelPais(e.target.checked)}
              className="w-4 h-4"
              style={{ accentColor: 'var(--color-rose-main)' }}
            />
            <span className="text-sm" style={{ color: 'var(--color-ink-mid)' }}>Visível para a família</span>
          </label>

          {erro && <p className="text-sm" style={{ color: '#B91C1C' }}>{erro}</p>}

          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={enviando}>
              {enviando ? 'Enviando...' : 'Enviar arquivo'}
            </Button>
            <Button variant="ghost" type="button" onClick={() => router.push(`/terapia/paciente/${pacienteId}`)}>
              Cancelar
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
