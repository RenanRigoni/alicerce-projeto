'use client'

import { useState, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

const tiposDocumento = [
  { value: 'laudo', label: 'Laudo médico' },
  { value: 'receita', label: 'Receita' },
  { value: 'exame', label: 'Exame' },
  { value: 'encaminhamento', label: 'Encaminhamento' },
  { value: 'outro', label: 'Outro' },
]

const labelStyle = { color: 'var(--color-ink-mid)' }

export default function UploadFamiliaPage() {
  const router = useRouter()
  const params = useParams()
  const pacienteId = params.id as string

  const [tipo, setTipo] = useState('laudo')
  const [descricao, setDescricao] = useState('')
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleEnviar() {
    if (!arquivo) { setErro('Selecione um arquivo.'); return }
    setErro('')
    setEnviando(true)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setErro('Sessão expirada.'); setEnviando(false); return }

    const ext = arquivo.name.split('.').pop()
    const path = `${pacienteId}/${Date.now()}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('documentos')
      .upload(path, arquivo, { upsert: false })

    if (uploadError) {
      setErro('Erro ao enviar o arquivo. Tente novamente.')
      setEnviando(false)
      return
    }

    const { data: { publicUrl } } = supabase.storage
      .from('documentos')
      .getPublicUrl(path)

    const { error: dbError } = await supabase.from('documentos').insert({
      paciente_id: pacienteId,
      enviado_por: user.id,
      tipo,
      descricao: descricao.trim() || null,
      arquivo_url: publicUrl,
      visivel_pais: true,
    })

    setEnviando(false)
    if (dbError) { setErro('Erro ao salvar o documento.'); return }

    router.push(`/portal/paciente/${pacienteId}?aba=documentos`)
  }

  return (
    <div className="space-y-6 max-w-md">
      <div className="flex items-center gap-3">
        <a
          href={`/portal/paciente/${pacienteId}?aba=documentos`}
          className="text-sm transition-colors hover:opacity-70"
          style={{ color: 'var(--color-ink-soft)' }}
        >
          ← Voltar
        </a>
        <h1
          className="text-2xl font-semibold"
          style={{ fontFamily: 'var(--font-lora)', color: 'var(--color-ink)' }}
        >
          Enviar documento
        </h1>
      </div>

      <Card>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5" style={labelStyle}>Tipo de documento</label>
            <select value={tipo} onChange={e => setTipo(e.target.value)} className="input-base">
              {tiposDocumento.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5" style={labelStyle}>Descrição (opcional)</label>
            <input
              type="text"
              value={descricao}
              onChange={e => setDescricao(e.target.value)}
              placeholder="Ex: Laudo neurológico — Dr. Silva"
              className="input-base"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5" style={labelStyle}>Arquivo</label>
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              onChange={e => setArquivo(e.target.files?.[0] ?? null)}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="w-full rounded-xl px-4 py-6 text-sm text-center transition-colors"
              style={{
                border: arquivo
                  ? '2px dashed var(--color-rose-soft)'
                  : '2px dashed var(--color-border)',
                color: arquivo ? 'var(--color-rose-main)' : 'var(--color-ink-faint)',
                background: 'transparent',
              }}
              onMouseOver={e => {
                if (!arquivo) {
                  e.currentTarget.style.borderColor = 'var(--color-rose-soft)'
                  e.currentTarget.style.color = 'var(--color-rose-main)'
                }
              }}
              onMouseOut={e => {
                if (!arquivo) {
                  e.currentTarget.style.borderColor = 'var(--color-border)'
                  e.currentTarget.style.color = 'var(--color-ink-faint)'
                }
              }}
            >
              {arquivo ? arquivo.name : 'Clique para selecionar o arquivo'}
            </button>
            <p className="text-xs mt-1" style={{ color: 'var(--color-ink-faint)' }}>
              PDF, imagem ou Word — máx. 10 MB
            </p>
          </div>

          {erro && <p className="text-sm" style={{ color: '#B91C1C' }}>{erro}</p>}

          <div className="flex gap-3 pt-1">
            <Button type="button" onClick={handleEnviar} disabled={enviando}>
              {enviando ? 'Enviando...' : 'Enviar documento'}
            </Button>
            <Button variant="ghost" type="button" onClick={() => router.push(`/portal/paciente/${pacienteId}?aba=documentos`)}>
              Cancelar
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
