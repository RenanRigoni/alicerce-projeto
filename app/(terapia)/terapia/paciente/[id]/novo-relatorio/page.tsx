'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { gerarHashRelatorio } from '@/lib/relatorio/gerar-hash'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

const secoes = [
  { key: 'identificacao',       label: '1. Identificação',           placeholder: 'Nome completo, data de nascimento, responsável, terapeuta responsável, período de avaliação...' },
  { key: 'obs_clinicas',        label: '2. Observações Clínicas',    placeholder: 'Descreva o comportamento observado durante as sessões, aspectos sensoriais, motores, cognitivos e sociais...' },
  { key: 'testes',              label: '3. Testes Aplicados',        placeholder: 'Liste os instrumentos de avaliação utilizados e os resultados obtidos...' },
  { key: 'resultado_discussao', label: '4. Resultado e Discussão',  placeholder: 'Análise e interpretação dos dados coletados em relação ao perfil ocupacional do paciente...' },
  { key: 'conclusao',           label: '5. Conclusão',               placeholder: 'Síntese dos achados, recomendações terapêuticas e encaminhamentos...' },
]

type CampoRelatorio = 'identificacao' | 'obs_clinicas' | 'testes' | 'resultado_discussao' | 'conclusao'

export default function NovoRelatorioPage() {
  const router = useRouter()
  const params = useParams()
  const pacienteId = params.id as string

  const [form, setForm] = useState<Record<CampoRelatorio, string>>({
    identificacao: '',
    obs_clinicas: '',
    testes: '',
    resultado_discussao: '',
    conclusao: '',
  })

  const [salvando, setSalvando] = useState(false)
  const [publicando, setPublicando] = useState(false)
  const [erro, setErro] = useState('')
  const [modalAberto, setModalAberto] = useState(false)
  const [nomeConfirmacao, setNomeConfirmacao] = useState('')
  const [nomeUsuario, setNomeUsuario] = useState('')

  function handleChange(key: CampoRelatorio, value: string) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  async function handleSalvarRascunho() {
    setErro('')
    setSalvando(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const { error } = await supabase.from('relatorios').insert({
      paciente_id: pacienteId,
      terapeuta_id: user!.id,
      ...form,
      status: 'rascunho',
    })

    setSalvando(false)
    if (error) { setErro('Erro ao salvar rascunho.'); return }
    router.push(`/terapia/paciente/${pacienteId}`)
  }

  async function abrirModalPublicacao() {
    setErro('')
    const camposVazios = secoes.filter(s => !form[s.key as CampoRelatorio].trim())
    if (camposVazios.length > 0) {
      setErro(`Preencha todos os campos antes de publicar: ${camposVazios.map(s => s.label).join(', ')}`)
      return
    }
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const { data: profile } = await supabase.from('profiles').select('nome').eq('id', user!.id).single()
    setNomeUsuario(profile?.nome ?? '')
    setModalAberto(true)
  }

  async function handlePublicar() {
    if (nomeConfirmacao.trim().toLowerCase() !== nomeUsuario.trim().toLowerCase()) {
      setErro('O nome digitado não corresponde ao seu nome cadastrado.')
      return
    }

    setPublicando(true)
    setErro('')

    const conteudoCompleto = secoes.map(s => `${s.label}\n${form[s.key as CampoRelatorio]}`).join('\n\n')
    const hash = await gerarHashRelatorio(conteudoCompleto)
    const agora = new Date().toISOString()
    const assinatura = `${nomeUsuario} — ${new Date().toLocaleString('pt-BR')} — ${hash.slice(0, 16)}`

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const { data: relatorio, error } = await supabase.from('relatorios').insert({
      paciente_id: pacienteId,
      terapeuta_id: user!.id,
      ...form,
      status: 'publicado',
      assinatura_digital: assinatura,
      assinado_em: agora,
      publicado_em: agora,
    }).select('id').single()

    setPublicando(false)

    if (error) { setErro('Erro ao publicar relatório.'); return }

    // Dispara geração de PDF em background
    fetch(`/api/relatorio/${relatorio.id}/pdf`, { method: 'POST' }).catch(() => {})

    router.push(`/terapia/paciente/${pacienteId}`)
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <a
          href={`/terapia/paciente/${pacienteId}`}
          className="text-sm transition-colors hover:opacity-70"
          style={{ color: 'var(--color-ink-soft)' }}
        >
          ← Voltar
        </a>
        <h1
          className="text-2xl font-semibold"
          style={{ fontFamily: 'var(--font-lora)', color: 'var(--color-ink)' }}
        >
          Novo relatório
        </h1>
      </div>

      <Card>
        <div className="space-y-6">
          {secoes.map(secao => (
            <div key={secao.key}>
              <label
                className="block text-sm font-semibold mb-2"
                style={{ color: 'var(--color-ink-mid)' }}
              >
                {secao.label}
              </label>
              <textarea
                value={form[secao.key as CampoRelatorio]}
                onChange={e => handleChange(secao.key as CampoRelatorio, e.target.value)}
                rows={5}
                className="input-base resize-y"
                placeholder={secao.placeholder}
              />
            </div>
          ))}

          {erro && (
            <p className="text-sm" style={{ color: '#B91C1C' }}>{erro}</p>
          )}

          <div className="flex gap-3 pt-2">
            <Button type="button" onClick={abrirModalPublicacao} disabled={salvando || publicando}>
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
        <div
          className="fixed inset-0 flex items-center justify-center z-50 px-4"
          style={{ background: 'rgba(44,32,24,0.4)' }}
        >
          <div
            className="rounded-2xl p-6 w-full max-w-sm space-y-4"
            style={{
              background: 'var(--color-warm-white)',
              boxShadow: '0 20px 60px rgba(44,32,24,0.2)',
            }}
          >
            <h2
              className="text-base font-semibold"
              style={{ fontFamily: 'var(--font-lora)', color: 'var(--color-ink)' }}
            >
              Assinar e publicar relatório
            </h2>
            <p className="text-sm" style={{ color: 'var(--color-ink-soft)' }}>
              Ao publicar, o relatório ficará visível para a família imediatamente.<br />
              Digite seu nome completo para confirmar a assinatura:
            </p>
            <div
              className="rounded-xl px-3 py-2 text-sm font-medium"
              style={{ background: 'var(--color-rose-blush)', color: 'var(--color-rose-deep)' }}
            >
              {nomeUsuario}
            </div>
            <input
              value={nomeConfirmacao}
              onChange={e => setNomeConfirmacao(e.target.value)}
              className="input-base"
              placeholder="Digite seu nome completo"
            />
            {erro && (
              <p className="text-sm" style={{ color: '#B91C1C' }}>{erro}</p>
            )}
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
