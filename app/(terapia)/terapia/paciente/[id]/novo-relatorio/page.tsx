'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { gerarHash } from '@/lib/hash/gerar-hash'

export default function NovoRelatorioPage() {
  const router = useRouter()
  const params = useParams()
  const pacienteId = params.id as string
  const inputRef = useRef<HTMLInputElement>(null)

  const [pacienteAtivo, setPacienteAtivo] = useState<boolean | null>(null)
  const [titulo, setTitulo] = useState('')
  const [previa, setPrevia] = useState('')
  const [adicionais, setAdicionais] = useState('')
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [publicando, setPublicando] = useState(false)
  const [erro, setErro] = useState('')
  const [declaracaoCoffito, setDeclaracaoCoffito] = useState(false)
  const [modalAberto, setModalAberto] = useState(false)
  const [creditoUsuario, setCreditoUsuario] = useState('')

  useEffect(() => {
    const supabase = createClient()
    supabase.from('pacientes').select('status').eq('id', pacienteId).single()
      .then(({ data }) => setPacienteAtivo(data?.status === 'ativo'))
  }, [pacienteId])
  const [nomeConfirmacao, setNomeConfirmacao] = useState('')
  const [nomeUsuario, setNomeUsuario] = useState('')

  async function uploadPdf(): Promise<{ path: string } | null> {
    if (!arquivo) return null

    const formData = new FormData()
    formData.append('arquivo', arquivo)
    formData.append('paciente_id', pacienteId)

    const res = await fetch('/api/upload/relatorio-pdf', {
      method: 'POST',
      body: formData,
    })

    const json = await res.json()
    if (!res.ok) {
      setErro(json.error ?? 'Erro ao enviar o arquivo PDF.')
      return null
    }
    return { path: json.path }
  }

  async function handleSalvarRascunho() {
    if (!titulo.trim()) { setErro('Título é obrigatório.'); return }
    setErro('')
    setSalvando(true)

    const upload = await uploadPdf()
    if (arquivo && !upload) { setSalvando(false); return }

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const { error } = await supabase.from('relatorios').insert({
      paciente_id: pacienteId,
      terapeuta_id: user!.id,
      identificacao: titulo.trim(),
      conclusao: previa.trim() || null,
      obs_clinicas: adicionais.trim() || null,
      pdf_url: upload?.path ?? null,
      status: 'rascunho',
    })

    setSalvando(false)
    if (error) { setErro(`Erro ao salvar rascunho: ${error.message}`); return }
    router.push(`/terapia/paciente/${pacienteId}`)
  }

  async function abrirModalPublicacao() {
    if (!titulo.trim()) { setErro('Título é obrigatório antes de publicar.'); return }
    setErro('')
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const { data: profile } = await supabase.from('profiles').select('nome, crefito').eq('id', user!.id).single()
    setNomeUsuario(profile?.nome ?? '')
    setCreditoUsuario(profile?.crefito ?? '')
    setModalAberto(true)
  }

  async function handlePublicar() {
    if (nomeConfirmacao.trim().toLowerCase() !== nomeUsuario.trim().toLowerCase()) {
      setErro('O nome digitado não corresponde ao seu nome cadastrado.')
      return
    }

    setPublicando(true)
    setErro('')

    const upload = await uploadPdf()
    if (arquivo && !upload) { setPublicando(false); return }

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const agora = new Date().toISOString()
    const relatorioId = crypto.randomUUID()
    const finalPdfPath = `${pacienteId}/${relatorioId}.pdf`
    const assinatura = creditoUsuario.trim()
      ? `${nomeUsuario} — CREFITO ${creditoUsuario.trim()} — ${new Date().toLocaleString('pt-BR')}`
      : `${nomeUsuario} — ${new Date().toLocaleString('pt-BR')}`

    const sourcePdfPath = upload?.path ?? null

    const hash = await gerarHash({
      relatorio_id: relatorioId,
      paciente_id: pacienteId,
      terapeuta_id: user!.id,
      identificacao: titulo.trim(),
      conclusao: previa.trim() || null,
      obs_clinicas: adicionais.trim() || null,
      pdf_url: finalPdfPath,
      assinado_em: agora,
      publicado_em: agora,
    })

    const { error } = await supabase.from('relatorios').insert({
      id: relatorioId,
      paciente_id: pacienteId,
      terapeuta_id: user!.id,
      identificacao: titulo.trim(),
      conclusao: previa.trim() || null,
      obs_clinicas: adicionais.trim() || null,
      pdf_url: finalPdfPath,
      status: 'rascunho',
      assinatura_digital: assinatura,
      assinado_em: agora,
      publicado_em: agora,
      hash_integridade: hash,
    })

    if (error) {
      setPublicando(false)
      setErro(`Erro ao publicar relatório: ${error.message}`)
      return
    }

    const pdfRes = await fetch(`/api/relatorio/${relatorioId}/pdf`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sourcePath: sourcePdfPath }),
    })
    const pdfJson = await pdfRes.json().catch(() => ({}))
    if (!pdfRes.ok) {
      setPublicando(false)
      setErro(pdfJson.error ?? 'Relatório salvo como rascunho, mas não foi possível autenticar o PDF.')
      return
    }

    const { error: publishError } = await supabase
      .from('relatorios')
      .update({ status: 'publicado' })
      .eq('id', relatorioId)

    setPublicando(false)

    if (publishError) {
      setErro(`PDF autenticado, mas não foi possível publicar o relatório: ${publishError.message}`)
      return
    }

    fetch(`/api/relatorio/${relatorioId}/publicado`, { method: 'POST' }).catch(() => {})

    router.push(`/terapia/paciente/${pacienteId}`)
  }

  const labelStyle = { color: 'var(--color-ink-mid)' }

  if (pacienteAtivo === false) {
    return (
      <div className="max-w-2xl space-y-4">
        <a href={`/terapia/paciente/${pacienteId}`} className="text-sm transition-colors hover:opacity-70" style={{ color: 'var(--color-ink-soft)' }}>
          ← Voltar
        </a>
        <Card>
          <p className="text-sm font-medium" style={{ color: '#B91C1C' }}>
            Prontuário encerrado — não é possível criar novos relatórios para paciente inativo.
          </p>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <a href={`/terapia/paciente/${pacienteId}`} className="text-sm transition-colors hover:opacity-70" style={{ color: 'var(--color-ink-soft)' }}>
          ← Voltar
        </a>
        <h1 className="text-2xl font-semibold" style={{ fontFamily: 'var(--font-lora)', color: 'var(--color-ink)' }}>
          Novo relatório
        </h1>
      </div>

      <Card>
        <div className="space-y-5">

          {/* Título */}
          <div>
            <label className="block text-sm font-medium mb-1.5" style={labelStyle}>
              Título do relatório <span style={{ color: 'var(--color-rose-main)' }}>*</span>
            </label>
            <input
              value={titulo}
              onChange={e => setTitulo(e.target.value)}
              placeholder="Ex: Relatório de avaliação — 1º semestre 2025"
              className="input-base"
            />
          </div>

          {/* PDF */}
          <div>
            <label className="block text-sm font-medium mb-1.5" style={labelStyle}>
              Anexo (PDF ou imagem)
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
              {arquivo ? `✓ ${arquivo.name}` : 'Clique para anexar o relatório em PDF'}
            </button>
            <p className="text-xs mt-1" style={{ color: 'var(--color-ink-faint)' }}>
              PDF ou imagem — máx. 15 MB. O arquivo contém o relatório completo.
            </p>
          </div>

          {/* Prévia */}
          <div>
            <label className="block text-sm font-medium mb-1.5" style={labelStyle}>Prévia</label>
            <textarea
              value={previa}
              onChange={e => setPrevia(e.target.value)}
              rows={3}
              placeholder="Resumo breve do relatório — aparece nas listagens..."
              className="input-base resize-y"
            />
            <p className="text-xs mt-1" style={{ color: 'var(--color-ink-faint)' }}>
              Texto curto que aparece antes do responsável abrir o relatório.
            </p>
          </div>

          {/* Adicionais */}
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

          {/* Declaração de responsabilidade COFFITO */}
          <label className="flex items-start gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={declaracaoCoffito}
              onChange={e => setDeclaracaoCoffito(e.target.checked)}
              className="mt-0.5 h-4 w-4 flex-shrink-0 rounded accent-[var(--color-rose-main)]"
            />
            <span className="text-sm leading-snug" style={{ color: 'var(--color-ink-mid)' }}>
              Declaro responsabilidade ética pelo conteúdo deste relatório, conforme{' '}
              <strong>COFFITO Res. 424/2013</strong>, e confirmo que as informações são
              verídicas e correspondem à evolução clínica do paciente.
            </span>
          </label>

          {erro && <p className="text-sm" style={{ color: '#B91C1C' }}>{erro}</p>}

          <div className="flex gap-3 pt-2">
            <Button type="button" onClick={abrirModalPublicacao} disabled={salvando || publicando || !declaracaoCoffito}>
              Publicar para a família
            </Button>
            <Button variant="secondary" type="button" onClick={handleSalvarRascunho} disabled={salvando || publicando}>
              {salvando ? 'Salvando...' : 'Salvar rascunho'}
            </Button>
            <Button variant="ghost" type="button" onClick={() => router.push(`/terapia/paciente/${pacienteId}`)}>
              Cancelar
            </Button>
          </div>
        </div>
      </Card>

      {/* Modal de assinatura */}
      {modalAberto && (
        <div className="fixed inset-0 flex items-center justify-center z-50 px-4" style={{ background: 'rgba(44,32,24,0.4)' }}>
          <div className="rounded-2xl p-6 w-full max-w-sm space-y-4" style={{ background: 'var(--color-warm-white)', boxShadow: '0 20px 60px rgba(44,32,24,0.2)' }}>
            <h2 className="text-base font-semibold" style={{ fontFamily: 'var(--font-lora)', color: 'var(--color-ink)' }}>
              Assinar e publicar relatório
            </h2>
            <p className="text-sm" style={{ color: 'var(--color-ink-soft)' }}>
              Ao publicar, o relatório ficará visível para a família imediatamente.<br />
              Digite seu nome completo para confirmar a assinatura:
            </p>
            <div className="rounded-xl px-3 py-2 text-sm font-medium" style={{ background: 'var(--color-rose-blush)', color: 'var(--color-rose-deep)' }}>
              {nomeUsuario}
            </div>
            <input
              value={nomeConfirmacao}
              onChange={e => setNomeConfirmacao(e.target.value)}
              className="input-base"
              placeholder="Digite seu nome completo"
            />
            {erro && <p className="text-sm" style={{ color: '#B91C1C' }}>{erro}</p>}
            <div className="flex gap-3">
              <Button onClick={handlePublicar} disabled={publicando}>
                {publicando ? 'Publicando...' : 'Confirmar e publicar'}
              </Button>
              <Button variant="ghost" onClick={() => { setModalAberto(false); setErro('') }}>
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
