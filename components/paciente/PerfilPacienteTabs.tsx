'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { AbaDadosClinicos } from './AbaDadosClinicos'
import { DeletarPacienteButton } from '@/components/admin/DeletarPacienteButton'

// ── Tipos ────────────────────────────────────────────────────

export interface DadosPaciente {
  id: string
  nome: string
  codigo_interno: string | null
  foto_url: string | null
  data_nascimento: string | null
  sexo: string | null
  cpf: string | null
  status: 'ativo' | 'alta' | 'desativado'
  motivo_desativacao: string | null
  data_inicio: string | null
  frequencia_atendimento: string | null
  horarios_atendimento: Array<{ dia: string; hora: string }>
  turno_preferencia: string | null
  convenio_ou_particular: string | null
}

export interface Responsavel {
  id: string
  nome: string
  tipo: 'principal' | 'secundario'
  endereco: string | null
  cidade: string | null
  cep: string | null
  telefone_principal: string | null
}

export interface DadosClinicos {
  hipotese_diagnostica: string | null
  diagnostico: string | null
  objetivos_terapeuticos: string | null
  plano_terapeutico: string | null
  demandas_prioritarias: string | null
  data_avaliacao_inicial: string | null
  obs_clinicas_gerais: string | null
  estrategias_utilizadas: string | null
  orientacoes_para_casa: string | null
  evolucao_resumida: string | null
  metas_curto_prazo: string | null
  metas_medio_prazo: string | null
  sensibilidades_restricoes: string | null
  nivel_suporte: string | null
  obs_comportamento_regulacao: string | null
  informacoes_escolares: string | null
  pontos_atencao_equipe: string | null
  atualizado_em: string | null
}

export interface Relatorio {
  id: string
  identificacao: string | null
  status: string
  publicado_em: string | null
  criado_em: string
  conclusao: string | null
  pdf_url: string | null
}

export interface Documento {
  id: string
  tipo: string
  descricao: string | null
  visivel_pais: boolean
  criado_em: string
  arquivo_url: string
}

export interface Orientacao {
  id: string
  titulo: string
  tipo: string
  url_midia: string | null
  conteudo: string
  criado_em: string
}

export interface SolicitacaoAlta {
  id: string
  status: string
  tipo: string
  motivo: string
  documento_url: string | null
  argumentacao_recusa: string | null
  criado_em: string
  solicitado_por_nome: string | null
}

interface Props {
  paciente: DadosPaciente
  terapeutas: Array<{ id: string; nome: string }>
  responsaveis: Responsavel[]
  dadosClinicos: DadosClinicos | null
  relatorios: Relatorio[]
  documentos: Documento[]
  orientacoes: Orientacao[]
  altas: SolicitacaoAlta[]
  role: 'admin' | 'recepcao' | 'terapeuta'
  ehTerapeutaVinculado: boolean
}

// ── Helpers ──────────────────────────────────────────────────

const statusLabel = { ativo: 'Ativo', alta: 'Alta', desativado: 'Desativado' }
const statusColor: Record<string, 'green' | 'gray' | 'rose'> = { ativo: 'green', alta: 'gray', desativado: 'rose' }
const diasLabel: Record<string, string> = {
  segunda: 'Seg', terca: 'Ter', quarta: 'Qua', quinta: 'Qui', sexta: 'Sex', sabado: 'Sáb',
}
const turnoLabel: Record<string, string> = { manha: 'Manhã', tarde: 'Tarde', qualquer: 'Qualquer' }

function Campo({ label, valor }: { label: string; valor?: string | null }) {
  if (!valor) return null
  return (
    <div>
      <div
        className="text-xs uppercase tracking-wide mb-0.5"
        style={{ color: 'var(--color-ink-faint)' }}
      >
        {label}
      </div>
      <div className="text-sm" style={{ color: 'var(--color-ink)' }}>{valor}</div>
    </div>
  )
}

// ── Abas ─────────────────────────────────────────────────────

const ABAS = [
  'Dados Gerais',
  'Responsáveis',
  'Dados Clínicos',
  'Relatórios',
  'Orientações',
  'Alta',
  'Histórico',
] as const

type Aba = typeof ABAS[number]

// ── Componente principal ─────────────────────────────────────

export function PerfilPacienteTabs({
  paciente, terapeutas, responsaveis, dadosClinicos,
  relatorios, documentos, orientacoes, altas,
  role, ehTerapeutaVinculado,
}: Props) {
  const router = useRouter()
  const [abaAtiva, setAbaAtiva] = useState<Aba>('Dados Gerais')

  // Modal vincular responsável
  const [modalResp, setModalResp] = useState(false)
  const [responsaveisDisp, setResponsaveisDisp] = useState<Array<{ id: string; nome: string }>>([])
  const [respSel, setRespSel] = useState('')
  const [tipoResp, setTipoResp] = useState<'principal' | 'secundario'>('principal')
  const [vinculando, setVinculando] = useState(false)
  const [erroResp, setErroResp] = useState('')

  async function abrirModalResp() {
    setErroResp(''); setRespSel(''); setTipoResp('principal')
    const { createClient } = await import('@/lib/supabase/client')
    const { data } = await createClient().from('profiles').select('id, nome').eq('role', 'pai').order('nome')
    setResponsaveisDisp((data ?? []).filter(r => !responsaveis.find(v => v.id === r.id)))
    setModalResp(true)
  }

  async function vincularResponsavel() {
    if (!respSel) { setErroResp('Selecione um responsável.'); return }
    setVinculando(true)
    const res = await fetch('/api/vincular/paciente-responsavel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paciente_id: paciente.id, responsavel_id: respSel, tipo: tipoResp }),
    })
    setVinculando(false)
    if (!res.ok) { setErroResp('Erro ao vincular.'); return }
    setModalResp(false)
    router.refresh()
  }

  // Modal ver relatório
  const [modalRel, setModalRel] = useState<Relatorio | null>(null)
  const [detalheRel, setDetalheRel] = useState<any>(null)
  const [carregandoRel, setCarregandoRel] = useState(false)

  async function abrirRelatorio(r: Relatorio) {
    setModalRel(r)
    setDetalheRel(null)
    setCarregandoRel(true)
    const { createClient } = await import('@/lib/supabase/client')
    const { data } = await createClient()
      .from('relatorios')
      .select('id, identificacao, obs_clinicas, testes, resultado_discussao, conclusao, assinatura_digital, assinado_em, status, criado_em, pdf_url')
      .eq('id', r.id)
      .single()
    setDetalheRel(data)
    setCarregandoRel(false)
  }

  const [oriExpandidas, setOriExpandidas] = useState<Set<string>>(new Set())
  const [oriHistoricoAberta, setOriHistoricoAberta] = useState<string | null>(null)
  function toggleOri(id: string) {
    setOriExpandidas(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const [novaOri, setNovaOri] = useState({ titulo: '', tipo: 'texto', url_midia: '', conteudo: '' })
  const [oriModoUpload, setOriModoUpload] = useState(false)
  const [oriArquivo, setOriArquivo] = useState<File | null>(null)
  const oriInputRef = useRef<HTMLInputElement>(null)
  const [salvandoOri, setSalvandoOri] = useState(false)
  const [erroOri, setErroOri] = useState('')

  // Edição de orientação
  const [editandoOri, setEditandoOri] = useState<{ id: string; titulo: string; tipo: string; url_midia: string; conteudo: string } | null>(null)
  const [salvandoEditOri, setSalvandoEditOri] = useState(false)
  const [erroEditOri, setErroEditOri] = useState('')

  async function handleSalvarEdicaoOri() {
    if (!editandoOri) return
    if (!editandoOri.titulo.trim()) { setErroEditOri('Título é obrigatório.'); return }
    setErroEditOri('')
    setSalvandoEditOri(true)
    const res = await fetch(`/api/orientacao/${editandoOri.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        titulo: editandoOri.titulo,
        tipo: editandoOri.tipo,
        url_midia: editandoOri.url_midia,
        conteudo: editandoOri.conteudo,
      }),
    })
    setSalvandoEditOri(false)
    if (!res.ok) { const j = await res.json(); setErroEditOri(j.error ?? 'Erro ao salvar.'); return }
    setEditandoOri(null)
    router.refresh()
  }

  async function handleDeletarOri(id: string) {
    if (!confirm('Excluir esta orientação?')) return
    await fetch(`/api/orientacao/${id}`, { method: 'DELETE' })
    router.refresh()
  }

  async function handleSalvarOrientacao() {
    if (!novaOri.titulo.trim()) { setErroOri('Título é obrigatório.'); return }
    const podeUpload = ['pdf', 'imagem'].includes(novaOri.tipo)
    const precisaUrl = ['video', 'pdf', 'imagem'].includes(novaOri.tipo)

    let urlFinal = novaOri.url_midia

    if (podeUpload && oriModoUpload) {
      if (!oriArquivo) { setErroOri('Selecione um arquivo.'); return }
      setErroOri('')
      setSalvandoOri(true)
      const fd = new FormData()
      fd.append('arquivo', oriArquivo)
      fd.append('pasta', `orientacoes/${paciente.id}`)
      const res = await fetch('/api/upload/midia', { method: 'POST', body: fd })
      if (!res.ok) { setSalvandoOri(false); setErroOri('Erro ao enviar arquivo.'); return }
      const json = await res.json()
      urlFinal = json.url
    } else if (precisaUrl && !oriModoUpload && !novaOri.url_midia.trim()) {
      setErroOri('URL é obrigatória para este tipo.')
      return
    }

    setErroOri('')
    setSalvandoOri(true)
    const res = await fetch('/api/orientacao', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paciente_id: paciente.id, ...novaOri, url_midia: urlFinal }),
    })
    setSalvandoOri(false)
    if (!res.ok) { const j = await res.json(); setErroOri(j.error ?? 'Erro ao salvar.'); return }
    setNovaOri({ titulo: '', tipo: 'texto', url_midia: '', conteudo: '' })
    setOriArquivo(null)
    setOriModoUpload(false)
    router.refresh()
  }

  const isAdminOuRecepcao = role === 'admin' || role === 'recepcao'
  const podeEditarClinicos = role === 'terapeuta' && ehTerapeutaVinculado

  return (
    <>
    <div className="space-y-4">
      {/* Cabeçalho */}
      <div className="flex items-center gap-3 flex-wrap">
        <a
          href={isAdminOuRecepcao ? '/admin/pacientes' : '/terapia/dashboard'}
          className="text-sm transition-colors hover:opacity-70"
          style={{ color: 'var(--color-ink-soft)' }}
        >
          ← Voltar
        </a>
        <h1
          className="text-2xl font-semibold"
          style={{ fontFamily: 'var(--font-lora)', color: 'var(--color-ink)' }}
        >
          {paciente.nome}
        </h1>
        {paciente.codigo_interno && (
          <span className="text-xs font-mono" style={{ color: 'var(--color-ink-faint)' }}>
            #{paciente.codigo_interno}
          </span>
        )}
        <Badge color={statusColor[paciente.status]}>{statusLabel[paciente.status]}</Badge>
      </div>

      {/* Tabs */}
      <div
        className="flex gap-0.5 border-b overflow-x-auto pb-0"
        style={{ borderColor: 'var(--color-border)' }}
      >
        {ABAS.map(aba => (
          <button
            key={aba}
            onClick={() => setAbaAtiva(aba)}
            className="px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px"
            style={{
              borderColor: abaAtiva === aba ? 'var(--color-rose-main)' : 'transparent',
              color: abaAtiva === aba ? 'var(--color-rose-main)' : 'var(--color-ink-soft)',
            }}
          >
            {aba}
          </button>
        ))}
      </div>

      {/* ── Aba 1: Dados Gerais ─────────────────────────────── */}
      {abaAtiva === 'Dados Gerais' && (
        <div className="space-y-4">
          <Card>
            <div className="grid grid-cols-2 gap-4">
              <Campo label="Código interno" valor={paciente.codigo_interno ? `#${paciente.codigo_interno}` : null} />
              <Campo label="Data de início" valor={paciente.data_inicio
                ? new Date(paciente.data_inicio).toLocaleDateString('pt-BR') : null} />
              <Campo label="Data de nascimento" valor={paciente.data_nascimento
                ? new Date(paciente.data_nascimento).toLocaleDateString('pt-BR') : null} />
              <Campo label="Sexo" valor={
                paciente.sexo === 'masculino' ? 'Masculino' :
                paciente.sexo === 'feminino' ? 'Feminino' :
                paciente.sexo === 'outro' ? 'Outro' : null
              } />
              <Campo label="CPF / Documento" valor={paciente.cpf} />
              <Campo label="Frequência" valor={paciente.frequencia_atendimento} />
              <Campo label="Tipo de atendimento" valor={
                paciente.convenio_ou_particular === 'convenio' ? 'Convênio' :
                paciente.convenio_ou_particular === 'particular' ? 'Particular' : null
              } />
              <Campo label="Turno preferencial" valor={
                paciente.turno_preferencia ? turnoLabel[paciente.turno_preferencia] : null
              } />
            </div>

            {paciente.horarios_atendimento?.length > 0 && (
              <div
                className="mt-4 pt-4 border-t"
                style={{ borderColor: 'var(--color-border-soft)' }}
              >
                <div
                  className="text-xs uppercase tracking-wide mb-2"
                  style={{ color: 'var(--color-ink-faint)' }}
                >
                  Horários
                </div>
                <div className="flex flex-wrap gap-2">
                  {paciente.horarios_atendimento.map((h, i) => (
                    <span
                      key={i}
                      className="text-sm px-3 py-1 rounded-full"
                      style={{ background: 'var(--color-rose-blush)', color: 'var(--color-rose-deep)' }}
                    >
                      {diasLabel[h.dia] ?? h.dia} · {h.hora}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {terapeutas.length > 0 && (
              <div
                className="mt-4 pt-4 border-t"
                style={{ borderColor: 'var(--color-border-soft)' }}
              >
                <div
                  className="text-xs uppercase tracking-wide mb-2"
                  style={{ color: 'var(--color-ink-faint)' }}
                >
                  Terapeutas
                </div>
                <div className="flex flex-wrap gap-2">
                  {terapeutas.map(t => (
                    <span
                      key={t.id}
                      className="text-sm px-3 py-1 rounded-full"
                      style={{ background: 'var(--color-sage-light)', color: 'var(--color-sage-deep)' }}
                    >
                      {t.nome}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {paciente.motivo_desativacao && (
              <div
                className="mt-4 pt-4 border-t"
                style={{ borderColor: 'var(--color-border-soft)' }}
              >
                <div
                  className="text-xs uppercase tracking-wide mb-1"
                  style={{ color: 'var(--color-ink-faint)' }}
                >
                  Motivo da desativação
                </div>
                <div className="text-sm" style={{ color: 'var(--color-ink-mid)' }}>
                  {paciente.motivo_desativacao}
                </div>
              </div>
            )}
          </Card>

          {/* Ações */}
          <div className="flex flex-wrap gap-2.5">
            {isAdminOuRecepcao && paciente.status === 'ativo' && (
              <a
                href={`/admin/pacientes/${paciente.id}/editar`}
                className="text-sm font-medium px-4 py-2 rounded-xl transition-all duration-200"
                style={{ background: 'var(--color-rose-blush)', color: 'var(--color-rose-deep)' }}
              >
                Editar dados
              </a>
            )}
            {role === 'terapeuta' && ehTerapeutaVinculado && paciente.status === 'ativo' && (
              <a
                href={`/terapia/paciente/${paciente.id}/editar`}
                className="text-sm font-medium px-4 py-2 rounded-xl transition-all duration-200"
                style={{ border: '1px solid var(--color-border)', color: 'var(--color-ink-soft)' }}
              >
                Editar dados básicos
              </a>
            )}
            {isAdminOuRecepcao && paciente.status === 'ativo' && (
              <a
                href={`/admin/pacientes/${paciente.id}/desativar`}
                className="text-sm font-medium px-4 py-2 rounded-xl transition-all duration-200"
                style={{ border: '1px solid var(--color-border)', color: 'var(--color-ink-soft)' }}
              >
                Desativar paciente
              </a>
            )}
            {isAdminOuRecepcao && paciente.status !== 'ativo' && (
              <a
                href={`/admin/pacientes/${paciente.id}/reativar`}
                className="text-sm font-medium px-4 py-2 rounded-xl transition-all duration-200"
                style={{ border: '1px solid var(--color-sage-soft)', background: 'var(--color-sage-light)', color: 'var(--color-sage-deep)' }}
              >
                Reativar paciente
              </a>
            )}
            {isAdminOuRecepcao && (
              <DeletarPacienteButton
                pacienteId={paciente.id}
                pacienteNome={paciente.nome}
              />
            )}
          </div>
        </div>
      )}

      {/* ── Aba 2: Responsáveis ─────────────────────────────── */}
      {abaAtiva === 'Responsáveis' && (
        <div className="space-y-3">
          {(role === 'admin' || role === 'recepcao') && (
            <div className="flex items-center justify-between">
              <span className="text-xs" style={{ color: 'var(--color-ink-faint)' }}>
                {responsaveis.length} responsável{responsaveis.length !== 1 ? 'is' : ''} vinculado{responsaveis.length !== 1 ? 's' : ''}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={abrirModalResp}
                  className="text-sm font-medium px-3 py-1.5 rounded-xl transition-opacity hover:opacity-80"
                  style={{ background: 'var(--color-rose-blush)', color: 'var(--color-rose-deep)' }}
                >
                  + Adicionar responsável
                </button>
                <a
                  href={`/admin/usuarios/novo`}
                  className="text-sm font-medium px-3 py-1.5 rounded-xl transition-opacity hover:opacity-80"
                  style={{ border: '1px solid var(--color-border)', color: 'var(--color-ink-mid)' }}
                >
                  Cadastrar novo
                </a>
              </div>
            </div>
          )}
          {responsaveis.length === 0 ? (
            <Card>
              <p className="text-sm" style={{ color: 'var(--color-ink-faint)' }}>
                Nenhum responsável vinculado.
              </p>
            </Card>
          ) : responsaveis.map(r => (
            <Card key={r.id}>
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <a
                    href={isAdminOuRecepcao ? `/admin/usuarios/${r.id}` : `/terapia/responsavel/${r.id}`}
                    className="font-medium transition-opacity hover:opacity-70"
                    style={{ color: 'var(--color-ink)' }}
                  >
                    {r.nome}
                  </a>
                  <span
                    className="ml-2 text-xs px-2 py-0.5 rounded-full font-medium"
                    style={r.tipo === 'principal'
                      ? { background: 'var(--color-rose-blush)', color: 'var(--color-rose-deep)' }
                      : { background: 'var(--color-border-soft)', color: 'var(--color-ink-soft)' }
                    }
                  >
                    {r.tipo === 'principal' ? 'Principal' : 'Secundário'}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {r.telefone_principal && (
                  <div>
                    <div className="text-xs mb-0.5" style={{ color: 'var(--color-ink-faint)' }}>Telefone</div>
                    <div style={{ color: 'var(--color-ink-mid)' }}>{r.telefone_principal}</div>
                  </div>
                )}
                {r.cidade && (
                  <div>
                    <div className="text-xs mb-0.5" style={{ color: 'var(--color-ink-faint)' }}>Cidade</div>
                    <div style={{ color: 'var(--color-ink-mid)' }}>{r.cidade}</div>
                  </div>
                )}
                {r.endereco && (
                  <div className="col-span-2">
                    <div className="text-xs mb-0.5" style={{ color: 'var(--color-ink-faint)' }}>Endereço</div>
                    <div style={{ color: 'var(--color-ink-mid)' }}>
                      {r.endereco}{r.cep ? ` — CEP ${r.cep}` : ''}
                    </div>
                  </div>
                )}
              </div>
              <div className="mt-3 pt-3 border-t flex justify-end" style={{ borderColor: 'var(--color-border-soft)' }}>
                <a
                  href={isAdminOuRecepcao ? `/admin/usuarios/${r.id}` : `/terapia/responsavel/${r.id}`}
                  className="text-xs transition-opacity hover:opacity-70"
                  style={{ color: 'var(--color-rose-main)' }}
                >
                  Ver perfil completo →
                </a>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* ── Aba 3: Dados Clínicos ───────────────────────────── */}
      {abaAtiva === 'Dados Clínicos' && (
        <AbaDadosClinicos
          pacienteId={paciente.id}
          dadosIniciais={dadosClinicos}
          podeEditar={podeEditarClinicos}
        />
      )}

      {/* ── Aba 4: Relatórios ───────────────────────────────── */}
      {abaAtiva === 'Relatórios' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs" style={{ color: 'var(--color-ink-faint)' }}>
              {relatorios.length} relatório{relatorios.length !== 1 ? 's' : ''}
            </span>
            {role === 'terapeuta' && paciente.status === 'ativo' && (
              <a
                href={`/terapia/paciente/${paciente.id}/novo-relatorio`}
                className="text-sm font-medium px-3 py-1.5 rounded-xl transition-opacity hover:opacity-80"
                style={{ background: 'var(--color-rose-blush)', color: 'var(--color-rose-deep)' }}
              >
                + Novo relatório
              </a>
            )}
          </div>
          {relatorios.length > 0 ? (
            <div className="space-y-2">
              {relatorios.map(r => (
                <Card key={r.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium" style={{ color: 'var(--color-ink)' }}>
                        {r.identificacao ?? 'Sem título'}
                      </div>
                      {r.conclusao && (
                        <p className="text-xs mt-0.5 line-clamp-2" style={{ color: 'var(--color-ink-soft)' }}>
                          {r.conclusao}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs" style={{ color: 'var(--color-ink-faint)' }}>
                          {new Date(r.criado_em).toLocaleDateString('pt-BR')}
                        </span>
                        <Badge color={r.status === 'publicado' ? 'green' : 'yellow'}>{r.status}</Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => abrirRelatorio(r)}
                        className="text-sm font-medium transition-opacity hover:opacity-70"
                        style={{ color: 'var(--color-rose-main)' }}
                      >
                        Ver
                      </button>
                      {role === 'terapeuta' && r.status === 'rascunho' && (
                        <a
                          href={`/terapia/relatorio/${r.id}/editar`}
                          className="text-xs font-medium px-2.5 py-1 rounded-lg transition-colors"
                          style={{ border: '1px solid var(--color-border)', color: 'var(--color-ink-soft)' }}
                        >
                          Editar
                        </a>
                      )}
                      {r.pdf_url && (
                        <a
                          href={r.pdf_url.startsWith('http') ? r.pdf_url : `/api/relatorio/${r.id}/pdf`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-medium px-2.5 py-1 rounded-lg transition-colors"
                          style={{ background: 'var(--color-rose-blush)', color: 'var(--color-rose-deep)' }}
                        >
                          PDF
                        </a>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <p className="text-sm" style={{ color: 'var(--color-ink-faint)' }}>
                Nenhum relatório ainda.
              </p>
            </Card>
          )}

          {/* Documentos (compacto) */}
          {documentos.length > 0 && (
            <div>
              <h3
                className="text-xs font-semibold uppercase tracking-wider mb-2 mt-4"
                style={{ color: 'var(--color-ink-soft)' }}
              >
                Documentos anexados
              </h3>
              <Card>
                <ul className="divide-y" style={{ borderColor: 'var(--color-border-soft)' }}>
                  {documentos.map(d => (
                    <li key={d.id} className="py-2.5 flex items-center justify-between first:pt-0 last:pb-0">
                      <div>
                        <div className="text-sm font-medium capitalize" style={{ color: 'var(--color-ink)' }}>
                          {d.tipo}
                        </div>
                        <div className="text-xs" style={{ color: 'var(--color-ink-soft)' }}>
                          {d.descricao ?? '—'} · {d.visivel_pais ? 'Visível às famílias' : 'Interno'}
                        </div>
                      </div>
                      <a
                        href={`/api/documento/${d.id}/download`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-medium transition-opacity hover:opacity-70"
                        style={{ color: 'var(--color-rose-main)' }}
                      >
                        Abrir
                      </a>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* ── Aba 5: Orientações ──────────────────────────────── */}
      {abaAtiva === 'Orientações' && (
        <div className="space-y-3">

          {/* Form de criação — apenas para terapeuta vinculado */}
          {role === 'terapeuta' && ehTerapeutaVinculado && (
            <Card>
              <p
                className="text-xs font-semibold uppercase tracking-wide mb-3"
                style={{ color: 'var(--color-ink-soft)' }}
              >
                Nova orientação
              </p>
              <div className="space-y-3">
                <input
                  value={novaOri.titulo}
                  onChange={e => setNovaOri(p => ({ ...p, titulo: e.target.value }))}
                  placeholder="Título da orientação"
                  className="input-base"
                />
                <select
                  value={novaOri.tipo}
                  onChange={e => setNovaOri(p => ({ ...p, tipo: e.target.value, url_midia: '' }))}
                  className="input-base"
                >
                  <option value="texto">Texto</option>
                  <option value="guia">Guia / Dica</option>
                  <option value="video">Vídeo (YouTube ou link)</option>
                  <option value="pdf">PDF (link)</option>
                  <option value="imagem">Imagem (link)</option>
                </select>

                {['video', 'pdf', 'imagem'].includes(novaOri.tipo) && (
                  <div className="space-y-2">
                    {['pdf', 'imagem'].includes(novaOri.tipo) && (
                      <div className="flex gap-1 p-0.5 rounded-lg w-fit" style={{ background: 'var(--color-border-soft)' }}>
                        {['Link', 'Upload'].map(op => (
                          <button
                            key={op}
                            type="button"
                            onClick={() => { setOriModoUpload(op === 'Upload'); setOriArquivo(null); setNovaOri(p => ({ ...p, url_midia: '' })) }}
                            className="text-xs px-3 py-1 rounded-md transition-colors"
                            style={
                              (op === 'Upload') === oriModoUpload
                                ? { background: 'var(--color-warm-white)', color: 'var(--color-ink)', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }
                                : { color: 'var(--color-ink-soft)' }
                            }
                          >
                            {op}
                          </button>
                        ))}
                      </div>
                    )}
                    {oriModoUpload && ['pdf', 'imagem'].includes(novaOri.tipo) ? (
                      <>
                        <input
                          ref={oriInputRef}
                          type="file"
                          accept={novaOri.tipo === 'pdf' ? '.pdf' : 'image/*'}
                          onChange={e => setOriArquivo(e.target.files?.[0] ?? null)}
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => oriInputRef.current?.click()}
                          className="w-full rounded-xl px-4 py-3 text-sm text-center transition-colors"
                          style={{
                            border: oriArquivo ? '2px dashed var(--color-rose-soft)' : '2px dashed var(--color-border)',
                            color: oriArquivo ? 'var(--color-rose-main)' : 'var(--color-ink-faint)',
                            background: 'transparent',
                          }}
                        >
                          {oriArquivo ? `✓ ${oriArquivo.name}` : `Clique para selecionar ${novaOri.tipo === 'pdf' ? 'PDF' : 'imagem'}`}
                        </button>
                      </>
                    ) : (
                      <input
                        value={novaOri.url_midia}
                        onChange={e => setNovaOri(p => ({ ...p, url_midia: e.target.value }))}
                        placeholder={
                          novaOri.tipo === 'video' ? 'https://www.youtube.com/watch?v=...' :
                          novaOri.tipo === 'pdf' ? 'https://link-do-pdf.com/arquivo.pdf' :
                          'https://link-da-imagem.com/foto.jpg'
                        }
                        className="input-base"
                      />
                    )}
                  </div>
                )}

                <textarea
                  value={novaOri.conteudo}
                  onChange={e => setNovaOri(p => ({ ...p, conteudo: e.target.value }))}
                  placeholder={
                    novaOri.tipo === 'texto' || novaOri.tipo === 'guia'
                      ? 'Escreva a orientação aqui...'
                      : 'Descrição ou comentário adicional (opcional)'
                  }
                  rows={novaOri.tipo === 'texto' || novaOri.tipo === 'guia' ? 4 : 2}
                  className="input-base resize-y"
                />

                {erroOri && (
                  <p className="text-sm" style={{ color: '#B91C1C' }}>{erroOri}</p>
                )}
                <Button onClick={handleSalvarOrientacao} disabled={salvandoOri}>
                  {salvandoOri ? 'Salvando...' : 'Salvar orientação'}
                </Button>
              </div>
            </Card>
          )}

          {orientacoes.length === 0 ? (
            <Card>
              <p className="text-sm" style={{ color: 'var(--color-ink-faint)' }}>
                Nenhuma orientação registrada.
              </p>
            </Card>
          ) : orientacoes.map(o => {
            const expandida = oriExpandidas.has(o.id)
            const tipoLabel: Record<string, string> = { video: 'Vídeo', pdf: 'PDF', imagem: 'Imagem', guia: 'Guia' }
            return (
              <Card key={o.id} id={`ori-${o.id}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium" style={{ color: 'var(--color-ink)' }}>{o.titulo}</div>
                    {!expandida && (
                      <p className="text-sm mt-0.5 line-clamp-2" style={{ color: 'var(--color-ink-soft)' }}>
                        {o.conteudo || (o.url_midia ? tipoLabel[o.tipo] ?? o.tipo : '')}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {o.tipo && o.tipo !== 'texto' && (
                      <span
                        className="text-xs px-2 py-0.5 rounded-full"
                        style={{ background: 'var(--color-rose-blush)', color: 'var(--color-rose-deep)' }}
                      >
                        {tipoLabel[o.tipo] ?? o.tipo}
                      </span>
                    )}
                    {ehTerapeutaVinculado && (
                      <>
                        <button
                          onClick={() => setEditandoOri({ id: o.id, titulo: o.titulo, tipo: o.tipo ?? 'texto', url_midia: o.url_midia ?? '', conteudo: o.conteudo ?? '' })}
                          className="text-xs font-medium px-2.5 py-1 rounded-lg transition-opacity hover:opacity-70"
                          style={{ border: '1px solid var(--color-border)', color: 'var(--color-ink-soft)' }}
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDeletarOri(o.id)}
                          className="text-xs font-medium px-2.5 py-1 rounded-lg transition-opacity hover:opacity-70"
                          style={{ border: '1px solid #FECACA', color: '#B91C1C', background: '#FEF2F2' }}
                        >
                          Excluir
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => toggleOri(o.id)}
                      className="text-xs font-medium px-2.5 py-1 rounded-lg transition-opacity hover:opacity-70"
                      style={{ background: 'var(--color-rose-blush)', color: 'var(--color-rose-deep)' }}
                    >
                      {expandida ? 'Fechar' : 'Ver'}
                    </button>
                  </div>
                </div>

                {expandida && (
                  <div className="mt-3 pt-3 border-t space-y-2" style={{ borderColor: 'var(--color-border-soft)' }}>
                    {(!o.tipo || o.tipo === 'texto' || o.tipo === 'guia') ? (
                      <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--color-ink-mid)' }}>
                        {o.conteudo}
                      </p>
                    ) : o.tipo === 'video' && o.url_midia ? (
                      <>
                        {o.url_midia.includes('youtu') ? (
                          <div className="aspect-video rounded-xl overflow-hidden" style={{ background: 'var(--color-border-soft)' }}>
                            <iframe
                              src={o.url_midia.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/')}
                              className="w-full h-full"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                            />
                          </div>
                        ) : (
                          <a href={o.url_midia} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-sm font-medium transition-opacity hover:opacity-70"
                            style={{ color: 'var(--color-rose-main)' }}
                          >
                            ▶ Assistir vídeo
                          </a>
                        )}
                        {o.conteudo && <p className="text-sm" style={{ color: 'var(--color-ink-soft)' }}>{o.conteudo}</p>}
                      </>
                    ) : o.tipo === 'pdf' && o.url_midia ? (
                      <>
                        <a href={o.url_midia} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-sm font-medium transition-opacity hover:opacity-70"
                          style={{ color: 'var(--color-rose-main)' }}
                        >
                          📄 Abrir PDF
                        </a>
                        {o.conteudo && <p className="text-sm" style={{ color: 'var(--color-ink-soft)' }}>{o.conteudo}</p>}
                      </>
                    ) : o.tipo === 'imagem' && o.url_midia ? (
                      <>
                        <img src={o.url_midia} alt={o.titulo} className="rounded-xl max-w-full max-h-64 object-contain" />
                        {o.conteudo && <p className="text-sm" style={{ color: 'var(--color-ink-soft)' }}>{o.conteudo}</p>}
                      </>
                    ) : (
                      o.conteudo && <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--color-ink-mid)' }}>{o.conteudo}</p>
                    )}
                  </div>
                )}

                <div className="text-xs mt-2" style={{ color: 'var(--color-ink-faint)' }}>
                  {new Date(o.criado_em).toLocaleDateString('pt-BR')}
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* ── Aba 6: Alta ─────────────────────────────────────── */}
      {abaAtiva === 'Alta' && (
        <div className="space-y-3">
          {altas.length === 0 ? (
            <Card>
              <p className="text-sm" style={{ color: 'var(--color-ink-faint)' }}>
                Nenhuma solicitação de alta registrada.
              </p>
            </Card>
          ) : altas.map(a => {
            const statusStyles: Record<string, React.CSSProperties> = {
              registrada:           { background: 'var(--color-sage-light)', color: 'var(--color-sage-deep)' },
              confirmada:           { background: 'var(--color-sage-light)', color: 'var(--color-sage-deep)' },
              aprovada:             { background: 'var(--color-sage-light)', color: 'var(--color-sage-deep)' },
              pendente_confirmacao: { background: '#FFFBEB', color: '#92400E' },
              pendente:             { background: '#FFFBEB', color: '#92400E' },
              recusada:             { background: '#FEF2F2', color: '#B91C1C' },
            }
            const statusLabels: Record<string, string> = {
              registrada:           'Registrada',
              confirmada:           'Confirmada',
              aprovada:             'Aprovada',
              pendente_confirmacao: 'Aguardando confirmação',
              pendente:             'Pendente',
              recusada:             'Recusada',
            }
            const tipoLabel = a.tipo === 'responsavel' ? 'Solicitada pelo responsável' : 'Registrada pela terapeuta'
            return (
              <Card key={a.id}>
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div>
                    <span className="font-medium text-sm" style={{ color: 'var(--color-ink)' }}>{tipoLabel}</span>
                    {a.solicitado_por_nome && (
                      <span className="text-sm ml-1.5" style={{ color: 'var(--color-ink-soft)' }}>· {a.solicitado_por_nome}</span>
                    )}
                  </div>
                  <span
                    className="text-xs px-2 py-0.5 rounded-full shrink-0"
                    style={statusStyles[a.status] ?? { background: 'var(--color-border-soft)', color: 'var(--color-ink-mid)' }}
                  >
                    {statusLabels[a.status] ?? a.status}
                  </span>
                </div>
                <div className="text-xs mt-0.5" style={{ color: 'var(--color-ink-faint)' }}>
                  {new Date(a.criado_em).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </div>
                {a.motivo && (
                  <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--color-border-soft)' }}>
                    <div className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--color-ink-faint)' }}>Motivo</div>
                    <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--color-ink-mid)' }}>{a.motivo}</p>
                  </div>
                )}
                {a.documento_url && (
                  <a
                    href={`/api/alta/${a.id}/documento`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs mt-2 inline-block font-medium transition-opacity hover:opacity-70"
                    style={{ color: 'var(--color-rose-main)' }}
                  >
                    Ver documento médico →
                  </a>
                )}
              </Card>
            )
          })}
        </div>
      )}

      {/* ── Aba 7: Histórico ────────────────────────────────── */}
      {abaAtiva === 'Histórico' && (() => {
        const tipoLabel: Record<string, string> = { video: 'Vídeo', pdf: 'PDF', imagem: 'Imagem', guia: 'Guia' }
        const itens = [
          ...altas.map(a => ({ tipo: 'alta' as const, criado_em: a.criado_em, data: a as any })),
          ...relatorios.map(r => ({ tipo: 'relatorio' as const, criado_em: r.criado_em, data: r as any })),
          ...documentos.map(d => ({ tipo: 'documento' as const, criado_em: d.criado_em, data: d as any })),
          ...orientacoes.map(o => ({ tipo: 'orientacao' as const, criado_em: o.criado_em, data: o as any })),
        ].sort((a, b) => new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime())

        if (itens.length === 0) return (
          <Card>
            <p className="text-sm" style={{ color: 'var(--color-ink-faint)' }}>
              Nenhum registro no histórico ainda.
            </p>
          </Card>
        )

        return (
          <div className="space-y-2">
            {itens.map((item) => {
              const dataFormatada = new Date(item.criado_em).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })

              if (item.tipo === 'alta') {
                const a = item.data as SolicitacaoAlta
                return (
                  <div key={`alta-${a.id}`} className="flex gap-3 items-start">
                    <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: '#D97706' }} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm" style={{ color: 'var(--color-ink-mid)' }}>
                        <span className="font-medium" style={{ color: 'var(--color-ink)' }}>Solicitação de alta</span>
                        {a.solicitado_por_nome && ` · ${a.solicitado_por_nome}`}
                        <span className="ml-2 text-xs px-1.5 py-0.5 rounded-full"
                          style={a.status === 'pendente' ? { background: '#FFFBEB', color: '#92400E' }
                            : a.status === 'aprovada' ? { background: 'var(--color-sage-light)', color: 'var(--color-sage-deep)' }
                            : { background: '#FEF2F2', color: '#B91C1C' }}
                        >{a.status}</span>
                      </div>
                      <div className="text-xs" style={{ color: 'var(--color-ink-faint)' }}>{dataFormatada}</div>
                    </div>
                    <button
                      onClick={() => setAbaAtiva('Alta')}
                      className="text-xs opacity-60 hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5"
                      style={{ color: '#D97706' }}
                    >
                      Ver →
                    </button>
                  </div>
                )
              }

              if (item.tipo === 'relatorio') {
                const r = item.data as Relatorio
                return (
                  <button key={`rel-${r.id}`} onClick={() => abrirRelatorio(r)} className="w-full flex gap-3 items-start text-left group">
                    <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                      style={{ background: r.status === 'publicado' ? 'var(--color-sage-main)' : 'var(--color-rose-soft)' }} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm" style={{ color: 'var(--color-ink-mid)' }}>
                        <span className="font-medium" style={{ color: 'var(--color-ink)' }}>
                          {r.status === 'publicado' ? 'Relatório publicado' : 'Rascunho'}
                        </span>
                        {r.identificacao && ` — ${r.identificacao}`}
                      </div>
                      <div className="text-xs" style={{ color: 'var(--color-ink-faint)' }}>{dataFormatada}</div>
                    </div>
                    <span className="text-xs opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5" style={{ color: 'var(--color-rose-main)' }}>Ver →</span>
                  </button>
                )
              }

              if (item.tipo === 'documento') {
                const d = item.data as Documento
                return (
                  <a key={`doc-${d.id}`} href={`/api/documento/${d.id}/download`} target="_blank" rel="noopener noreferrer" className="flex gap-3 items-start group">
                    <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: 'var(--color-lavender-main)' }} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm" style={{ color: 'var(--color-ink-mid)' }}>
                        <span className="font-medium" style={{ color: 'var(--color-ink)' }}>Documento anexado</span>
                        {d.descricao && ` — ${d.descricao}`}
                      </div>
                      <div className="text-xs" style={{ color: 'var(--color-ink-faint)' }}>{dataFormatada}</div>
                    </div>
                    <span className="text-xs opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5" style={{ color: 'var(--color-lavender-main)' }}>Abrir →</span>
                  </a>
                )
              }

              if (item.tipo === 'orientacao') {
                const o = item.data as Orientacao
                const aberta = oriHistoricoAberta === o.id
                return (
                  <div key={`ori-${o.id}`} className="flex flex-col gap-0">
                    <button
                      onClick={() => setOriHistoricoAberta(prev => prev === o.id ? null : o.id)}
                      className="w-full flex gap-3 items-start text-left group"
                    >
                      <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: 'var(--color-peach-main)' }} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm" style={{ color: 'var(--color-ink-mid)' }}>
                          <span className="font-medium" style={{ color: 'var(--color-ink)' }}>Orientação registrada</span>
                          {' — '}{o.titulo}
                          {o.tipo && o.tipo !== 'texto' && (
                            <span className="ml-1.5 text-xs px-1.5 py-0.5 rounded-full" style={{ background: 'var(--color-rose-blush)', color: 'var(--color-rose-deep)' }}>
                              {tipoLabel[o.tipo] ?? o.tipo}
                            </span>
                          )}
                        </div>
                        <div className="text-xs" style={{ color: 'var(--color-ink-faint)' }}>{dataFormatada}</div>
                      </div>
                      <span className="text-xs flex-shrink-0 mt-0.5 font-medium" style={{ color: 'var(--color-peach-main)' }}>
                        {aberta ? 'Fechar ↑' : 'Ver →'}
                      </span>
                    </button>
                    {aberta && (
                      <div className="ml-5 mt-2 p-3 rounded-xl space-y-2" style={{ background: 'var(--color-border-soft)' }}>
                        {(!o.tipo || o.tipo === 'texto' || o.tipo === 'guia') ? (
                          <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--color-ink-mid)' }}>{o.conteudo}</p>
                        ) : o.tipo === 'video' && o.url_midia ? (
                          <>
                            {o.url_midia.includes('youtu') ? (
                              <div className="aspect-video rounded-xl overflow-hidden">
                                <iframe
                                  src={o.url_midia.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/')}
                                  className="w-full h-full"
                                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                  allowFullScreen
                                />
                              </div>
                            ) : (
                              <a href={o.url_midia} target="_blank" rel="noopener noreferrer" className="text-sm font-medium" style={{ color: 'var(--color-rose-main)' }}>
                                ▶ Assistir vídeo
                              </a>
                            )}
                            {o.conteudo && <p className="text-sm" style={{ color: 'var(--color-ink-soft)' }}>{o.conteudo}</p>}
                          </>
                        ) : o.tipo === 'pdf' && o.url_midia ? (
                          <>
                            <a href={o.url_midia} target="_blank" rel="noopener noreferrer" className="text-sm font-medium" style={{ color: 'var(--color-rose-main)' }}>
                              Abrir PDF
                            </a>
                            {o.conteudo && <p className="text-sm" style={{ color: 'var(--color-ink-soft)' }}>{o.conteudo}</p>}
                          </>
                        ) : o.tipo === 'imagem' && o.url_midia ? (
                          <>
                            <img src={o.url_midia} alt={o.titulo} className="rounded-xl max-w-full max-h-48 object-contain" />
                            {o.conteudo && <p className="text-sm" style={{ color: 'var(--color-ink-soft)' }}>{o.conteudo}</p>}
                          </>
                        ) : (
                          o.conteudo && <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--color-ink-mid)' }}>{o.conteudo}</p>
                        )}
                      </div>
                    )}
                  </div>
                )
              }

              return null
            })}
          </div>
        )
      })()}
    </div>

    {/* Modal: editar orientação */}
    {editandoOri && (
      <div
        className="fixed inset-0 flex items-center justify-center z-50 px-4 py-6 overflow-y-auto"
        style={{ background: 'rgba(44,32,24,0.4)' }}
      >
        <div
          className="rounded-2xl p-6 w-full max-w-lg space-y-4 my-auto"
          style={{ background: 'var(--color-warm-white)', boxShadow: '0 20px 60px rgba(44,32,24,0.2)' }}
        >
          <h2 className="text-base font-semibold" style={{ fontFamily: 'var(--font-lora)', color: 'var(--color-ink)' }}>
            Editar orientação
          </h2>

          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-ink-mid)' }}>Título</label>
            <input
              type="text"
              value={editandoOri.titulo}
              onChange={e => setEditandoOri(prev => prev && ({ ...prev, titulo: e.target.value }))}
              className="input-base"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-ink-mid)' }}>Tipo</label>
            <select
              value={editandoOri.tipo}
              onChange={e => setEditandoOri(prev => prev && ({ ...prev, tipo: e.target.value, url_midia: '', conteudo: '' }))}
              className="input-base"
            >
              {['texto', 'video', 'pdf', 'imagem', 'guia'].map(t => (
                <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
              ))}
            </select>
          </div>

          {['video', 'pdf', 'imagem'].includes(editandoOri.tipo) && (
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-ink-mid)' }}>URL</label>
              <input
                type="text"
                value={editandoOri.url_midia}
                onChange={e => setEditandoOri(prev => prev && ({ ...prev, url_midia: e.target.value }))}
                className="input-base"
                placeholder="https://..."
              />
            </div>
          )}

          {['texto', 'guia'].includes(editandoOri.tipo) && (
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-ink-mid)' }}>Conteúdo</label>
              <textarea
                value={editandoOri.conteudo}
                onChange={e => setEditandoOri(prev => prev && ({ ...prev, conteudo: e.target.value }))}
                rows={5}
                className="input-base resize-y"
              />
            </div>
          )}

          {erroEditOri && <p className="text-sm" style={{ color: '#B91C1C' }}>{erroEditOri}</p>}

          <div className="flex gap-3 pt-1">
            <button
              onClick={handleSalvarEdicaoOri}
              disabled={salvandoEditOri}
              className="flex-1 text-sm font-medium px-4 py-2 rounded-xl text-white transition-colors disabled:opacity-50"
              style={{ background: 'var(--color-sage-main)' }}
            >
              {salvandoEditOri ? 'Salvando...' : 'Salvar alterações'}
            </button>
            <button
              onClick={() => { setEditandoOri(null); setErroEditOri('') }}
              className="text-sm px-4 py-2 rounded-xl transition-colors"
              style={{ color: 'var(--color-ink-soft)' }}
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Modal: ver relatório completo */}
    {modalRel && (
      <div
        className="fixed inset-0 flex items-center justify-center z-50 p-4"
        style={{ background: 'rgba(44,32,24,0.5)' }}
        onClick={() => { setModalRel(null); setDetalheRel(null) }}
      >
        <div
          className="rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
          style={{ background: 'var(--color-warm-white)', boxShadow: '0 20px 60px rgba(44,32,24,0.2)' }}
          onClick={e => e.stopPropagation()}
        >
          <div
            className="sticky top-0 flex items-center justify-between px-5 py-4 border-b"
            style={{ background: 'var(--color-warm-white)', borderColor: 'var(--color-border-soft)' }}
          >
            <h3 className="font-semibold" style={{ color: 'var(--color-ink)', fontFamily: 'var(--font-lora)' }}>
              {modalRel.identificacao ?? 'Relatório'}
            </h3>
            <div className="flex items-center gap-2">
              {modalRel.pdf_url && (
                <a
                  href={modalRel.pdf_url.startsWith('http') ? modalRel.pdf_url : `/api/relatorio/${modalRel.id}/pdf`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-medium px-3 py-1.5 rounded-lg"
                  style={{ background: 'var(--color-rose-blush)', color: 'var(--color-rose-deep)' }}
                >
                  Baixar PDF
                </a>
              )}
              <button
                onClick={() => { setModalRel(null); setDetalheRel(null) }}
                className="text-lg hover:opacity-60"
                style={{ color: 'var(--color-ink-faint)' }}
              >
                ×
              </button>
            </div>
          </div>
          <div className="p-5 space-y-5">
            {carregandoRel ? (
              <p className="text-sm" style={{ color: 'var(--color-ink-faint)' }}>Carregando...</p>
            ) : detalheRel ? (
              <>
                {detalheRel.conclusao && (
                  <div>
                    <div className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--color-ink-faint)' }}>Prévia / Conclusão</div>
                    <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--color-ink-mid)' }}>{detalheRel.conclusao}</p>
                  </div>
                )}
                {detalheRel.obs_clinicas && (
                  <div>
                    <div className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--color-ink-faint)' }}>Observações Clínicas</div>
                    <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--color-ink-mid)' }}>{detalheRel.obs_clinicas}</p>
                  </div>
                )}
                {detalheRel.testes && (
                  <div>
                    <div className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--color-ink-faint)' }}>Testes Aplicados</div>
                    <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--color-ink-mid)' }}>{detalheRel.testes}</p>
                  </div>
                )}
                {detalheRel.resultado_discussao && (
                  <div>
                    <div className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--color-ink-faint)' }}>Resultado e Discussão</div>
                    <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--color-ink-mid)' }}>{detalheRel.resultado_discussao}</p>
                  </div>
                )}
                {detalheRel.assinatura_digital && (
                  <div
                    className="rounded-xl px-3 py-2 text-xs"
                    style={{ background: 'var(--color-border-soft)', color: 'var(--color-ink-soft)' }}
                  >
                    ✓ {detalheRel.assinatura_digital}
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm" style={{ color: 'var(--color-ink-faint)' }}>Sem conteúdo disponível.</p>
            )}
          </div>
        </div>
      </div>
    )}

    {/* Modal: vincular responsável existente */}
    {modalResp && (
      <div
        className="fixed inset-0 flex items-center justify-center z-50 p-4"
        style={{ background: 'rgba(44,32,24,0.4)' }}
        onClick={() => setModalResp(false)}
      >
        <div
          className="rounded-2xl p-5 max-w-sm w-full space-y-4"
          style={{ background: 'var(--color-warm-white)', boxShadow: '0 20px 60px rgba(44,32,24,0.2)' }}
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center justify-between">
            <h3 className="font-semibold" style={{ color: 'var(--color-ink)' }}>Adicionar responsável</h3>
            <button onClick={() => setModalResp(false)} className="text-lg hover:opacity-60" style={{ color: 'var(--color-ink-faint)' }}>×</button>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs uppercase tracking-wide mb-1 block" style={{ color: 'var(--color-ink-faint)' }}>Responsável</label>
              {responsaveisDisp.length === 0 ? (
                <p className="text-sm" style={{ color: 'var(--color-ink-faint)' }}>
                  Nenhum responsável disponível.{' '}
                  <Link href="/admin/usuarios/novo" style={{ color: 'var(--color-rose-main)' }}>Cadastrar novo →</Link>
                </p>
              ) : (
                <select
                  value={respSel}
                  onChange={e => setRespSel(e.target.value)}
                  className="input-base w-full"
                >
                  <option value="">Selecione...</option>
                  {responsaveisDisp.map(r => (
                    <option key={r.id} value={r.id}>{r.nome}</option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="text-xs uppercase tracking-wide mb-1 block" style={{ color: 'var(--color-ink-faint)' }}>Tipo</label>
              <select
                value={tipoResp}
                onChange={e => setTipoResp(e.target.value as 'principal' | 'secundario')}
                className="input-base w-full"
              >
                <option value="principal">Principal</option>
                <option value="secundario">Secundário</option>
              </select>
            </div>
          </div>

          {erroResp && <p className="text-sm" style={{ color: '#B91C1C' }}>{erroResp}</p>}

          <div className="flex gap-2 pt-1">
            <button
              onClick={vincularResponsavel}
              disabled={vinculando || !respSel}
              className="text-sm font-medium px-4 py-2 rounded-xl text-white transition-all disabled:opacity-50"
              style={{ background: 'var(--color-rose-main)' }}
            >
              {vinculando ? 'Vinculando...' : 'Vincular'}
            </button>
            <button
              onClick={() => setModalResp(false)}
              className="text-sm px-3 py-2 rounded-xl transition-opacity hover:opacity-70"
              style={{ color: 'var(--color-ink-soft)' }}
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  )
}
