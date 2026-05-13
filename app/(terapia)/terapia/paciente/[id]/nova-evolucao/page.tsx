'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { gerarHash } from '@/lib/hash/gerar-hash'
import { getTipoProfissionalConfig } from '@/lib/profissionais'

export default function NovaEvolucaoPage() {
  const router = useRouter()
  const params = useParams()
  const pacienteId = params.id as string
  const inputRef = useRef<HTMLInputElement>(null)

  const [pacienteAtivo, setPacienteAtivo] = useState<boolean | null>(null)
  const [titulo, setTitulo] = useState('')
  const [previa, setPrevia] = useState('')
  const [adicionais, setAdicionais] = useState('')
  const [arquivos, setArquivos] = useState<File[]>([])
  const [salvando, setSalvando] = useState(false)
  const [publicando, setPublicando] = useState(false)
  const [erro, setErro] = useState('')
  const [declaracaoCoffito, setDeclaracaoCoffito] = useState(false)
  const [modalAberto, setModalAberto] = useState(false)
  const [creditoUsuario, setCreditoUsuario] = useState('')
  const [conselhoTipoUsuario, setConselhoTipoUsuario] = useState('')
  const [nomeConfirmacao, setNomeConfirmacao] = useState('')
  const [nomeUsuario, setNomeUsuario] = useState('')

  useEffect(() => {
    const supabase = createClient()
    supabase.from('pacientes').select('status').eq('id', pacienteId).single()
      .then(({ data }) => setPacienteAtivo(data?.status === 'ativo'))
  }, [pacienteId])

  async function uploadArquivos(): Promise<{ path: string } | null> {
    if (arquivos.length === 0) return null

    const formData = new FormData()
    formData.append('arquivo', arquivos[0])
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
    if (!titulo.trim()) { setErro('Titulo e obrigatorio.'); return }
    setErro('')
    setSalvando(true)

    const upload = await uploadArquivos()
    if (arquivos.length > 0 && !upload) { setSalvando(false); return }

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const { error } = await supabase.from('evolucoes').insert({
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
    if (!titulo.trim()) { setErro('Titulo e obrigatorio antes de publicar.'); return }
    setErro('')
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const { data: profile } = await supabase
      .from('profiles')
      .select('nome, crefito, tipo_profissional, conselho_tipo, conselho_numero')
      .eq('id', user!.id)
      .single()
    const conselhoTipo = profile?.conselho_tipo ?? getTipoProfissionalConfig(profile?.tipo_profissional).conselho
    setNomeUsuario(profile?.nome ?? '')
    setCreditoUsuario(profile?.conselho_numero ?? profile?.crefito ?? '')
    setConselhoTipoUsuario(conselhoTipo)
    setModalAberto(true)
  }

  async function handlePublicar() {
    if (nomeConfirmacao.trim().toLowerCase() !== nomeUsuario.trim().toLowerCase()) {
      setErro('O nome digitado nao corresponde ao seu nome cadastrado.')
      return
    }

    setPublicando(true)
    setErro('')

    const upload = await uploadArquivos()
    if (arquivos.length > 0 && !upload) { setPublicando(false); return }

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const agora = new Date().toISOString()
    const evolucaoId = crypto.randomUUID()
    const finalPdfPath = `${pacienteId}/evolucoes/${evolucaoId}.pdf`

    const assinaturaProfissional = creditoUsuario.trim()
      ? `${nomeUsuario} - ${conselhoTipoUsuario} ${creditoUsuario.trim()} - ${new Date().toLocaleString('pt-BR')}`
      : `${nomeUsuario} - ${new Date().toLocaleString('pt-BR')}`

    const sourcePdfPath = upload?.path ?? null

    const hash = await gerarHash({
      evolucao_id: evolucaoId,
      paciente_id: pacienteId,
      terapeuta_id: user!.id,
      nome_terapeuta: nomeUsuario,
      conselho_tipo_terapeuta: conselhoTipoUsuario || null,
      conselho_numero_terapeuta: creditoUsuario.trim() || null,
      identificacao: titulo.trim(),
      conclusao: previa.trim() || null,
      obs_clinicas: adicionais.trim() || null,
      pdf_url: finalPdfPath,
      assinado_em: agora,
      publicado_em: agora,
    })

    const { error } = await supabase.from('evolucoes').insert({
      id: evolucaoId,
      paciente_id: pacienteId,
      terapeuta_id: user!.id,
      identificacao: titulo.trim(),
      conclusao: previa.trim() || null,
      obs_clinicas: adicionais.trim() || null,
      pdf_url: finalPdfPath,
      status: 'rascunho',
      assinatura_digital: assinaturaProfissional,
      assinado_em: agora,
      publicado_em: agora,
      hash_integridade: hash,
    })

    if (error) {
      setPublicando(false)
      setErro(`Erro ao publicar evolucao: ${error.message}`)
      return
    }

    const pdfRes = await fetch(`/api/evolucao/${evolucaoId}/pdf`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sourcePath: sourcePdfPath }),
    })
    const pdfJson = await pdfRes.json().catch(() => ({}))
    if (!pdfRes.ok) {
      setPublicando(false)
      setErro(pdfJson.error ?? 'Evolucao salva como rascunho, mas nao foi possivel autenticar o PDF.')
      return
    }

    const publishRes = await fetch(`/api/evolucao/${evolucaoId}/publicado`, { method: 'POST' })
    const publishJson = await publishRes.json().catch(() => ({}))

    setPublicando(false)

    if (!publishRes.ok) {
      setErro(publishJson.error ?? 'PDF autenticado, mas nao foi possivel publicar a evolucao.')
      return
    }

    router.push(`/terapia/paciente/${pacienteId}`)
  }

  const labelStyle = { color: 'var(--color-ink-mid)' }

  if (pacienteAtivo === false) {
    return (
      <div className="max-w-2xl space-y-4">
        <a href={`/terapia/paciente/${pacienteId}`} className="text-sm transition-colors hover:opacity-70" style={{ color: 'var(--color-ink-soft)' }}>
          Voltar
        </a>
        <Card>
          <p className="text-sm font-medium" style={{ color: '#B91C1C' }}>
            Prontuario encerrado. Nao e possivel criar novas evolucoes para paciente inativo.
          </p>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <a href={`/terapia/paciente/${pacienteId}`} className="text-sm transition-colors hover:opacity-70" style={{ color: 'var(--color-ink-soft)' }}>
          Voltar
        </a>
        <h1 className="text-2xl font-semibold" style={{ fontFamily: 'var(--font-lora)', color: 'var(--color-ink)' }}>
          Nova evolucao
        </h1>
      </div>

      <Card>
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium mb-1.5" style={labelStyle}>
              Titulo da evolucao <span style={{ color: 'var(--color-rose-main)' }}>*</span>
            </label>
            <input
              value={titulo}
              onChange={e => setTitulo(e.target.value)}
              placeholder="Ex: Evolucao de acompanhamento - maio"
              className="input-base"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5" style={labelStyle}>
              Anexo (PDF ou imagem)
            </label>
            <input ref={inputRef} type="file" multiple accept=".pdf,.jpg,.jpeg,.png" onChange={e => setArquivos(Array.from(e.target.files ?? []))} className="hidden" />
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="w-full rounded-xl px-4 py-5 text-sm text-center transition-colors"
              style={{
                border: arquivos.length > 0 ? '2px dashed var(--color-rose-soft)' : '2px dashed var(--color-border)',
                color: arquivos.length > 0 ? 'var(--color-rose-main)' : 'var(--color-ink-faint)',
                background: 'transparent',
              }}
            >
              {arquivos.length > 0
                ? arquivos.map(f => f.name).join(', ')
                : 'Clique para anexar a evolucao em PDF'}
            </button>
            <p className="text-xs mt-1" style={{ color: 'var(--color-ink-faint)' }}>
              PDF ou imagem - max. 15 MB por arquivo. Primeiro arquivo sera usado como anexo principal.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5" style={labelStyle}>Previa</label>
            <textarea
              value={previa}
              onChange={e => setPrevia(e.target.value)}
              rows={3}
              placeholder="Resumo breve da evolucao - aparece nas listagens..."
              className="input-base resize-y"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5" style={labelStyle}>Observacoes adicionais</label>
            <textarea
              value={adicionais}
              onChange={e => setAdicionais(e.target.value)}
              rows={2}
              placeholder="Anotacoes complementares (opcional)"
              className="input-base resize-y"
            />
          </div>

          <label className="flex items-start gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={declaracaoCoffito}
              onChange={e => setDeclaracaoCoffito(e.target.checked)}
              className="mt-0.5 h-4 w-4 flex-shrink-0 rounded accent-[var(--color-rose-main)]"
            />
            <span className="text-sm leading-snug" style={{ color: 'var(--color-ink-mid)' }}>
              Declaro responsabilidade etica pelo conteudo desta evolucao e confirmo que as informacoes correspondem ao acompanhamento clinico do paciente.
            </span>
          </label>

          {erro && <p className="text-sm" style={{ color: '#B91C1C' }}>{erro}</p>}

          <div className="flex gap-3 pt-2">
            <Button type="button" onClick={abrirModalPublicacao} disabled={salvando || publicando || !declaracaoCoffito}>
              Publicar para a familia
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

      {modalAberto && (
        <div className="fixed inset-0 flex items-center justify-center z-50 px-4" style={{ background: 'rgba(44,32,24,0.4)' }}>
          <div className="rounded-2xl p-6 w-full max-w-sm space-y-4" style={{ background: 'var(--color-warm-white)', boxShadow: '0 20px 60px rgba(44,32,24,0.2)' }}>
            <h2 className="text-base font-semibold" style={{ fontFamily: 'var(--font-lora)', color: 'var(--color-ink)' }}>
              Assinar e publicar evolucao
            </h2>
            <p className="text-sm" style={{ color: 'var(--color-ink-soft)' }}>
              Ao publicar, a evolucao ficara visivel para a familia imediatamente.
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
