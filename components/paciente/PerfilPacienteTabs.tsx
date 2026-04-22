'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
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
  motivo: string
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
  meuId: string
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
  'Relatórios e Docs',
  'Orientações',
  'Histórico',
] as const

type Aba = typeof ABAS[number]

// ── Componente principal ─────────────────────────────────────

export function PerfilPacienteTabs({
  paciente, terapeutas, responsaveis, dadosClinicos,
  relatorios, documentos, orientacoes, altas,
  role, meuId, ehTerapeutaVinculado,
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

  const [novaOri, setNovaOri] = useState({ titulo: '', tipo: 'texto', url_midia: '', conteudo: '' })
  const [salvandoOri, setSalvandoOri] = useState(false)
  const [erroOri, setErroOri] = useState('')

  async function handleSalvarOrientacao() {
    if (!novaOri.titulo.trim()) { setErroOri('Título é obrigatório.'); return }
    const precisaUrl = ['video', 'pdf', 'imagem'].includes(novaOri.tipo)
    if (precisaUrl && !novaOri.url_midia.trim()) { setErroOri('URL é obrigatória para este tipo.'); return }
    setErroOri('')
    setSalvandoOri(true)
    const res = await fetch('/api/orientacao', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paciente_id: paciente.id, ...novaOri }),
    })
    setSalvandoOri(false)
    if (!res.ok) { const j = await res.json(); setErroOri(j.error ?? 'Erro ao salvar.'); return }
    setNovaOri({ titulo: '', tipo: 'texto', url_midia: '', conteudo: '' })
    router.refresh()
  }

  const isAdmin = role === 'admin'
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
                  <span className="font-medium" style={{ color: 'var(--color-ink)' }}>{r.nome}</span>
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

      {/* ── Aba 4: Relatórios e Documentos ──────────────────── */}
      {abaAtiva === 'Relatórios e Docs' && (
        <div className="space-y-4">
          {/* Relatórios */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold" style={{ color: 'var(--color-ink-mid)' }}>
                Relatórios
              </h3>
              {role === 'terapeuta' && paciente.status === 'ativo' && (
                <a
                  href={`/terapia/paciente/${paciente.id}/novo-relatorio`}
                  className="text-xs font-medium transition-opacity hover:opacity-70"
                  style={{ color: 'var(--color-rose-main)' }}
                >
                  + Novo
                </a>
              )}
            </div>
            {relatorios.length > 0 ? (
              <ul className="divide-y" style={{ borderColor: 'var(--color-border-soft)' }}>
                {relatorios.map(r => (
                  <li key={r.id} className="py-3 flex items-center justify-between first:pt-0 last:pb-0">
                    <div>
                      <div className="text-sm font-medium" style={{ color: 'var(--color-ink)' }}>
                        {r.identificacao ?? 'Sem título'}
                      </div>
                      <div className="text-xs" style={{ color: 'var(--color-ink-faint)' }}>
                        {new Date(r.criado_em).toLocaleDateString('pt-BR')}
                      </div>
                    </div>
                    <Badge color={r.status === 'publicado' ? 'green' : 'yellow'}>{r.status}</Badge>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm" style={{ color: 'var(--color-ink-faint)' }}>
                Nenhum relatório ainda.
              </p>
            )}
          </Card>

          {/* Documentos */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold" style={{ color: 'var(--color-ink-mid)' }}>
                Documentos e arquivos
              </h3>
              {role === 'terapeuta' && paciente.status === 'ativo' && (
                <a
                  href={`/terapia/paciente/${paciente.id}/novo-documento`}
                  className="text-xs font-medium transition-opacity hover:opacity-70"
                  style={{ color: 'var(--color-rose-main)' }}
                >
                  + Anexar
                </a>
              )}
            </div>
            {documentos.length > 0 ? (
              <ul className="divide-y" style={{ borderColor: 'var(--color-border-soft)' }}>
                {documentos.map(d => (
                  <li key={d.id} className="py-3 flex items-center justify-between first:pt-0 last:pb-0">
                    <div>
                      <div className="text-sm font-medium capitalize" style={{ color: 'var(--color-ink)' }}>
                        {d.tipo}
                      </div>
                      <div className="text-xs" style={{ color: 'var(--color-ink-soft)' }}>
                        {d.descricao ?? '—'}
                      </div>
                    </div>
                    <span className="text-xs" style={{ color: 'var(--color-ink-faint)' }}>
                      {d.visivel_pais ? 'Visível às famílias' : 'Interno'}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm" style={{ color: 'var(--color-ink-faint)' }}>
                Nenhum arquivo anexado.
              </p>
            )}
          </Card>
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
          ) : orientacoes.map(o => (
            <Card key={o.id}>
              <div className="flex items-start justify-between gap-2 mb-1">
                <div className="font-medium" style={{ color: 'var(--color-ink)' }}>{o.titulo}</div>
                {o.tipo && o.tipo !== 'texto' && (
                  <span
                    className="text-xs px-2 py-0.5 rounded-full flex-shrink-0"
                    style={{ background: 'var(--color-rose-blush)', color: 'var(--color-rose-deep)' }}
                  >
                    {{ video: 'Vídeo', pdf: 'PDF', imagem: 'Imagem', guia: 'Guia' }[o.tipo] ?? o.tipo}
                  </span>
                )}
              </div>

              {(!o.tipo || o.tipo === 'texto' || o.tipo === 'guia') ? (
                <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--color-ink-mid)' }}>
                  {o.conteudo}
                </p>
              ) : o.tipo === 'video' && o.url_midia ? (
                <div className="mt-1 space-y-2">
                  {o.url_midia.includes('youtu') ? (
                    <div
                      className="aspect-video rounded-xl overflow-hidden"
                      style={{ background: 'var(--color-border-soft)' }}
                    >
                      <iframe
                        src={o.url_midia
                          .replace('watch?v=', 'embed/')
                          .replace('youtu.be/', 'youtube.com/embed/')}
                        className="w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  ) : (
                    <a
                      href={o.url_midia}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm font-medium transition-opacity hover:opacity-70"
                      style={{ color: 'var(--color-rose-main)' }}
                    >
                      ▶ Assistir vídeo
                    </a>
                  )}
                  {o.conteudo && (
                    <p className="text-sm" style={{ color: 'var(--color-ink-soft)' }}>{o.conteudo}</p>
                  )}
                </div>
              ) : o.tipo === 'pdf' && o.url_midia ? (
                <div className="mt-1 space-y-1">
                  <a
                    href={o.url_midia}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm font-medium transition-opacity hover:opacity-70"
                    style={{ color: 'var(--color-rose-main)' }}
                  >
                    📄 Abrir PDF
                  </a>
                  {o.conteudo && (
                    <p className="text-sm" style={{ color: 'var(--color-ink-soft)' }}>{o.conteudo}</p>
                  )}
                </div>
              ) : o.tipo === 'imagem' && o.url_midia ? (
                <div className="mt-1 space-y-1">
                  <img
                    src={o.url_midia}
                    alt={o.titulo}
                    className="rounded-xl max-w-full max-h-64 object-contain"
                  />
                  {o.conteudo && (
                    <p className="text-sm" style={{ color: 'var(--color-ink-soft)' }}>{o.conteudo}</p>
                  )}
                </div>
              ) : (
                o.conteudo && (
                  <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--color-ink-mid)' }}>
                    {o.conteudo}
                  </p>
                )
              )}

              <div className="text-xs mt-2" style={{ color: 'var(--color-ink-faint)' }}>
                {new Date(o.criado_em).toLocaleDateString('pt-BR')}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* ── Aba 6: Histórico ────────────────────────────────── */}
      {abaAtiva === 'Histórico' && (
        <div className="space-y-2">
          {altas.map(a => (
            <div key={a.id} className="flex gap-3 items-start">
              <div
                className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                style={{ background: '#D97706' }}
              />
              <div className="flex-1 min-w-0">
                <div className="text-sm" style={{ color: 'var(--color-ink-mid)' }}>
                  <span className="font-medium" style={{ color: 'var(--color-ink)' }}>
                    Solicitação de alta
                  </span>
                  {a.solicitado_por_nome && ` · ${a.solicitado_por_nome}`}
                  <span
                    className="ml-2 text-xs px-1.5 py-0.5 rounded-full"
                    style={
                      a.status === 'pendente'
                        ? { background: '#FFFBEB', color: '#92400E' }
                        : a.status === 'aprovada'
                        ? { background: 'var(--color-sage-light)', color: 'var(--color-sage-deep)' }
                        : { background: '#FEF2F2', color: '#B91C1C' }
                    }
                  >
                    {a.status}
                  </span>
                </div>
                <div className="text-xs" style={{ color: 'var(--color-ink-faint)' }}>
                  {new Date(a.criado_em).toLocaleDateString('pt-BR')}
                </div>
              </div>
            </div>
          ))}

          {relatorios.map(r => (
            <div key={r.id} className="flex gap-3 items-start">
              <div
                className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                style={{ background: r.status === 'publicado' ? 'var(--color-sage-main)' : 'var(--color-rose-soft)' }}
              />
              <div>
                <div className="text-sm" style={{ color: 'var(--color-ink-mid)' }}>
                  <span className="font-medium" style={{ color: 'var(--color-ink)' }}>
                    {r.status === 'publicado' ? 'Relatório publicado' : 'Rascunho'}
                  </span>
                  {r.identificacao && ` — ${r.identificacao}`}
                </div>
                <div className="text-xs" style={{ color: 'var(--color-ink-faint)' }}>
                  {new Date(r.criado_em).toLocaleDateString('pt-BR')}
                </div>
              </div>
            </div>
          ))}

          {documentos.map(d => (
            <div key={d.id} className="flex gap-3 items-start">
              <div
                className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                style={{ background: 'var(--color-lavender-main)' }}
              />
              <div>
                <div className="text-sm" style={{ color: 'var(--color-ink-mid)' }}>
                  <span className="font-medium" style={{ color: 'var(--color-ink)' }}>
                    Documento anexado
                  </span>
                  {d.descricao && ` — ${d.descricao}`}
                </div>
                <div className="text-xs" style={{ color: 'var(--color-ink-faint)' }}>
                  {new Date(d.criado_em).toLocaleDateString('pt-BR')}
                </div>
              </div>
            </div>
          ))}

          {orientacoes.map(o => (
            <div key={o.id} className="flex gap-3 items-start">
              <div
                className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                style={{ background: 'var(--color-peach-main)' }}
              />
              <div>
                <div className="text-sm" style={{ color: 'var(--color-ink-mid)' }}>
                  <span className="font-medium" style={{ color: 'var(--color-ink)' }}>
                    Orientação registrada
                  </span>
                  {' — '}{o.titulo}
                </div>
                <div className="text-xs" style={{ color: 'var(--color-ink-faint)' }}>
                  {new Date(o.criado_em).toLocaleDateString('pt-BR')}
                </div>
              </div>
            </div>
          ))}

          {altas.length + relatorios.length + documentos.length + orientacoes.length === 0 && (
            <Card>
              <p className="text-sm" style={{ color: 'var(--color-ink-faint)' }}>
                Nenhum registro no histórico ainda.
              </p>
            </Card>
          )}
        </div>
      )}
    </div>

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
                  <a href="/admin/usuarios/novo" style={{ color: 'var(--color-rose-main)' }}>Cadastrar novo →</a>
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
