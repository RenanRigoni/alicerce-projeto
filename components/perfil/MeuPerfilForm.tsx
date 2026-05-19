'use client'

import { useState, useTransition, useRef } from 'react'
import { salvarMeuPerfil } from '@/lib/actions/perfil-actions'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Pencil, X, Lock, Camera, Trash2 } from 'lucide-react'
import { UFS_BRASIL, getTipoProfissionalConfig } from '@/lib/profissionais'
import Image from 'next/image'

interface Props {
  userId: string
  nome: string
  email: string | null
  telefone: string | null
  cpf: string | null
  role: string
  criadoEm: string
  fotoUrl: string | null
  dataNascimento: string | null
  rg: string | null
  sexo: string | null
  estadoCivil: string | null
  tipoProfissional: string | null
  conselhoTipo: string | null
  conselhoNumero: string | null
  conselhoUf: string | null
  cboCodigo: string | null
  especialidade: string | null
  biografia: string | null
}

const roleLabel: Record<string, string> = {
  admin: 'Administrador', recepcao: 'Recepção', terapeuta: 'Profissional', pai: 'Família',
}

const roleBadgeStyle: Record<string, { background: string; color: string }> = {
  admin:     { background: 'var(--color-rose-blush)',  color: 'var(--color-rose-deep)' },
  recepcao:  { background: '#FEF3C7',                  color: '#92400E' },
  terapeuta: { background: 'var(--color-sage-light)',  color: 'var(--color-sage-deep)' },
  pai:       { background: 'var(--color-peach-light)', color: 'var(--color-peach-main)' },
}

const avatarColors: Record<string, string> = {
  admin:     'bg-[var(--color-rose-blush)] text-[var(--color-rose-deep)]',
  recepcao:  'bg-amber-50 text-amber-700',
  terapeuta: 'bg-[var(--color-sage-light)] text-[var(--color-sage-deep)]',
  pai:       'bg-[var(--color-peach-light)] text-[var(--color-peach-main)]',
}

const ESTADOS_CIVIS = [
  { value: '',               label: 'Não informado' },
  { value: 'solteiro',      label: 'Solteiro(a)' },
  { value: 'casado',        label: 'Casado(a)' },
  { value: 'divorciado',    label: 'Divorciado(a)' },
  { value: 'viuvo',         label: 'Viúvo(a)' },
  { value: 'uniao_estavel', label: 'União estável' },
  { value: 'outro',         label: 'Outro' },
]

function formatarCpf(valor?: string | null) {
  const d = valor?.replace(/\D/g, '') ?? ''
  if (d.length === 11) return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9)}`
  if (d.length === 14) return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8,12)}-${d.slice(12)}`
  return valor ?? null
}

function mascaraTelefone(valor: string) {
  const d = valor.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 2) return d.length ? `(${d}` : ''
  if (d.length <= 7) return `(${d.slice(0,2)}) ${d.slice(2)}`
  return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`
}

function initials(nome: string) {
  return nome.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
}

const inputCls = 'w-full text-sm rounded-xl px-3 py-2.5 outline-none focus:ring-1 focus:ring-[var(--color-rose-main)] transition-all'
const inputActiveStyle = {
  border: '1.5px solid var(--color-rose-main)',
  background: 'var(--color-cream)',
  color: 'var(--color-ink)',
}

export function MeuPerfilForm(props: Props) {
  const { userId, cpf, role, criadoEm, conselhoTipo, tipoProfissional } = props

  const [editando, setEditando]           = useState(false)
  const [isPending, startTransition]      = useTransition()
  const [uploadando, setUploadando]       = useState(false)
  const [toast, setToast]                 = useState<string | null>(null)
  const fileRef                           = useRef<HTMLInputElement>(null)

  const [fotoUrl, setFotoUrl]             = useState(props.fotoUrl)
  const [nome, setNome]                   = useState(props.nome)
  const [emailVal, setEmailVal]           = useState(props.email ?? '')
  const [telefone, setTelefone]           = useState(props.telefone ?? '')
  const [dataNasc, setDataNasc]           = useState(props.dataNascimento ?? '')
  const [rg, setRg]                       = useState(props.rg ?? '')
  const [sexo, setSexo]                   = useState(props.sexo ?? '')
  const [estadoCivil, setEstadoCivil]     = useState(props.estadoCivil ?? '')
  const [conselhoNum, setConselhoNum]     = useState(props.conselhoNumero ?? '')
  const [conselhoUf, setConselhoUf]       = useState(props.conselhoUf ?? '')
  const [cbo, setCbo]                     = useState(props.cboCodigo ?? '')
  const [especialidade, setEspecialidade] = useState(props.especialidade ?? '')
  const [biografia, setBiografia]         = useState(props.biografia ?? '')

  const tipoConfig        = role === 'terapeuta' ? getTipoProfissionalConfig(tipoProfissional) : null
  const cpfFormatado      = formatarCpf(cpf)
  const dataCriacao       = new Date(criadoEm).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
  const estadoCivilLabel  = ESTADOS_CIVIS.find(e => e.value === estadoCivil)?.label ?? ''
  const sexoLabel         = sexo === 'masculino' ? 'Masculino' : sexo === 'feminino' ? 'Feminino' : sexo === 'outro' ? 'Outro' : ''
  const dataNascFormatada = dataNasc
    ? new Date(dataNasc + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
    : ''

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 4000)
  }

  function cancelar() {
    setNome(props.nome)
    setEmailVal(props.email ?? '')
    setTelefone(props.telefone ?? '')
    setDataNasc(props.dataNascimento ?? '')
    setRg(props.rg ?? '')
    setSexo(props.sexo ?? '')
    setEstadoCivil(props.estadoCivil ?? '')
    setConselhoNum(props.conselhoNumero ?? '')
    setConselhoUf(props.conselhoUf ?? '')
    setCbo(props.cboCodigo ?? '')
    setEspecialidade(props.especialidade ?? '')
    setBiografia(props.biografia ?? '')
    setEditando(false)
  }

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadando(true)
    try {
      const supabase = createClient()
      const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
      const path = `${userId}/avatar.${ext}`
      const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true, contentType: file.type })
      if (error) throw error
      const { data } = supabase.storage.from('avatars').getPublicUrl(path)
      await supabase.from('profiles').update({ foto_url: data.publicUrl }).eq('id', userId)
      setFotoUrl(data.publicUrl + `?v=${Date.now()}`)
      showToast('Foto atualizada!')
    } catch { showToast('Erro ao enviar foto.') }
    finally { setUploadando(false); if (fileRef.current) fileRef.current.value = '' }
  }

  async function removerFoto() {
    setUploadando(true)
    try {
      const supabase = createClient()
      await supabase.from('profiles').update({ foto_url: null }).eq('id', userId)
      setFotoUrl(null)
      showToast('Foto removida.')
    } catch { showToast('Erro ao remover foto.') }
    finally { setUploadando(false) }
  }

  function salvar() {
    startTransition(async () => {
      try {
        const fd = new FormData()
        fd.append('role', role)
        fd.append('nome', nome)
        fd.append('telefone', telefone)
        fd.append('data_nascimento', dataNasc)
        fd.append('rg', rg)
        fd.append('sexo', sexo)
        fd.append('estado_civil', estadoCivil)
        if (role === 'terapeuta') {
          fd.append('conselho_numero', conselhoNum)
          fd.append('conselho_uf', conselhoUf)
          fd.append('cbo_codigo', cbo)
          fd.append('especialidade', especialidade)
          fd.append('biografia', biografia)
        }
        await salvarMeuPerfil(fd)

        // Email change via auth (sends confirmation to new address)
        const emailMudou = emailVal.trim() && emailVal.trim() !== props.email
        if (emailMudou) {
          const supabase = createClient()
          const { error } = await supabase.auth.updateUser({ email: emailVal.trim() })
          if (error) throw error
          showToast('Dados salvos! Confirme o novo e-mail na sua caixa de entrada.')
        } else {
          showToast('Dados atualizados!')
        }
        setEditando(false)
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Erro ao salvar.'
        showToast(msg)
      }
    })
  }

  return (
    <div className="space-y-5">
      {/* ── Card principal ── */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ border: '1px solid var(--color-border-soft)', background: 'var(--color-warm-white)' }}
      >
        {/* Header: avatar (coluna esquerda) + nome/cargo/botão (coluna direita) */}
        <div
          className="px-6 py-5 flex items-start gap-5"
          style={{ borderBottom: '1px solid var(--color-border-soft)' }}
        >
          {/* Avatar + botões de foto (só no modo edição) */}
          <div className="shrink-0 flex flex-col items-center gap-2">
            <div className="relative w-20 h-20 rounded-full overflow-hidden flex items-center justify-center">
              {fotoUrl ? (
                <Image src={fotoUrl} alt={nome} width={80} height={80} className="w-full h-full object-cover" unoptimized />
              ) : (
                <div className={`w-full h-full flex items-center justify-center text-2xl font-semibold ${avatarColors[role]}`}>
                  {initials(nome)}
                </div>
              )}
              {editando && (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploadando}
                  className="absolute inset-0 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(0,0,0,0.42)' }}
                >
                  {uploadando
                    ? <Loader2 size={20} className="animate-spin text-white" />
                    : <Camera size={20} className="text-white" />}
                </button>
              )}
            </div>
            {/* Botões de foto — empilhados ABAIXO do avatar, evita overflow horizontal */}
            {editando && (
              <div className="flex flex-col items-center gap-1 w-full">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploadando}
                  className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg w-full justify-center transition-opacity hover:opacity-70"
                  style={{ color: 'var(--color-ink-mid)', border: '1px solid var(--color-border)' }}
                >
                  <Camera size={11} /> Escolher foto
                </button>
                {fotoUrl && (
                  <button
                    type="button"
                    onClick={removerFoto}
                    disabled={uploadando}
                    className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg w-full justify-center transition-opacity hover:opacity-70"
                    style={{ color: 'var(--color-ink-mid)', border: '1px solid var(--color-border)' }}
                  >
                    <Trash2 size={11} /> Remover foto
                  </button>
                )}
              </div>
            )}
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={onFileChange} />
          </div>

          {/* Nome + badge + botão editar */}
          <div className="flex-1 min-w-0 flex items-start justify-between gap-3 pt-1">
            <div className="min-w-0">
              <div className="text-lg font-semibold" style={{ fontFamily: 'var(--font-lora)', color: 'var(--color-ink)' }}>
                {nome}
              </div>
              <div
                className="inline-flex items-center mt-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium"
                style={roleBadgeStyle[role] ?? { background: 'var(--color-border-soft)', color: 'var(--color-ink-mid)' }}
              >
                {roleLabel[role] ?? role}
              </div>
            </div>
            {!editando && (
              <button
                onClick={() => setEditando(true)}
                className="shrink-0 flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-opacity hover:opacity-80"
                style={{ color: 'var(--color-rose-main)', background: 'var(--color-rose-blush)' }}
              >
                <Pencil size={13} />
                Editar informações
              </button>
            )}
          </div>
        </div>

        {/* Campos */}
        <div className="px-6 py-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">

            <Campo label="Nome completo" editando={editando}>
              {editando
                ? <input value={nome} onChange={e => setNome(e.target.value)} className={inputCls} style={inputActiveStyle} />
                : <Val>{nome}</Val>}
            </Campo>

            {/* E-mail — editável (Supabase envia confirmação ao novo endereço) */}
            <Campo label="E-mail" editando={editando}>
              {editando ? (
                <div>
                  <input
                    type="email"
                    value={emailVal}
                    onChange={e => setEmailVal(e.target.value)}
                    className={inputCls}
                    style={inputActiveStyle}
                  />
                  <p className="text-xs mt-1" style={{ color: 'var(--color-ink-faint)' }}>
                    Um link de confirmação será enviado ao novo e-mail.
                  </p>
                </div>
              ) : <Val empty="Não informado">{emailVal}</Val>}
            </Campo>

            <Campo label="Telefone" editando={editando}>
              {editando
                ? <input value={telefone} onChange={e => setTelefone(mascaraTelefone(e.target.value))} placeholder="(00) 00000-0000" inputMode="numeric" className={inputCls} style={inputActiveStyle} />
                : <Val empty="Não informado">{telefone}</Val>}
            </Campo>

            <Campo label="Data de nascimento" editando={editando}>
              {editando
                ? <input type="date" value={dataNasc} onChange={e => setDataNasc(e.target.value)} className={inputCls} style={inputActiveStyle} />
                : <Val empty="Não informado">{dataNascFormatada}</Val>}
            </Campo>

            {/* CPF — sempre bloqueado */}
            <CampoLocked label="CPF" value={cpfFormatado} />

            <Campo label="RG" editando={editando}>
              {editando
                ? <input value={rg} onChange={e => setRg(e.target.value)} placeholder="Digite" className={inputCls} style={inputActiveStyle} />
                : <Val empty="Não informado">{rg}</Val>}
            </Campo>

            <Campo label="Sexo" editando={editando}>
              {editando ? (
                <div className="flex gap-2">
                  {(['feminino', 'masculino', 'outro'] as const).map(op => (
                    <button
                      key={op}
                      type="button"
                      onClick={() => setSexo(sexo === op ? '' : op)}
                      className="flex-1 py-2 rounded-xl text-sm transition-all"
                      style={{
                        border: sexo === op ? '1.5px solid var(--color-rose-main)' : '1.5px solid var(--color-border)',
                        background: sexo === op ? 'var(--color-rose-blush)' : 'transparent',
                        color: sexo === op ? 'var(--color-rose-main)' : 'var(--color-ink-mid)',
                        fontWeight: sexo === op ? 500 : 400,
                      }}
                    >
                      {op.charAt(0).toUpperCase() + op.slice(1)}
                    </button>
                  ))}
                </div>
              ) : <Val empty="Não informado">{sexoLabel}</Val>}
            </Campo>

            <Campo label="Estado civil" editando={editando}>
              {editando ? (
                <select value={estadoCivil} onChange={e => setEstadoCivil(e.target.value)} className={inputCls} style={inputActiveStyle}>
                  {ESTADOS_CIVIS.map(op => <option key={op.value} value={op.value}>{op.label}</option>)}
                </select>
              ) : <Val empty="Não informado">{estadoCivilLabel}</Val>}
            </Campo>

            {/* Cargo — sempre bloqueado */}
            <CampoLocked label="Cargo" value={roleLabel[role] ?? role} />

            <Campo label="Cadastrado em" editando={false}>
              <Val>{dataCriacao}</Val>
            </Campo>

          </div>
        </div>

        {/* Botões salvar/cancelar */}
        {editando && (
          <div
            className="px-6 py-4 flex items-center gap-3"
            style={{ borderTop: '1px solid var(--color-border-soft)' }}
          >
            <button
              onClick={salvar}
              disabled={isPending}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-opacity disabled:opacity-60"
              style={{ background: 'var(--color-rose-main)', color: '#fff' }}
            >
              {isPending && <Loader2 size={14} className="animate-spin" />}
              Salvar alterações
            </button>
            <button
              onClick={cancelar}
              disabled={isPending}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm transition-opacity hover:opacity-70"
              style={{ color: 'var(--color-ink-mid)' }}
            >
              <X size={14} />
              Cancelar
            </button>
          </div>
        )}
      </div>

      {/* ── Informações profissionais (terapeuta) ── */}
      {role === 'terapeuta' && (
        <div
          className="rounded-2xl overflow-hidden"
          style={{ border: '1px solid var(--color-border-soft)', background: 'var(--color-warm-white)' }}
        >
          <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--color-border-soft)' }}>
            <div className="text-sm font-semibold" style={{ color: 'var(--color-ink)' }}>Informações profissionais</div>
          </div>

          <div className="px-6 py-5 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">

              <CampoLocked label="Tipo profissional" value={tipoConfig?.label ?? tipoProfissional ?? null} />
              <CampoLocked label="Conselho" value={conselhoTipo ?? tipoConfig?.conselho ?? null} />

              <Campo label={`Nº ${tipoConfig?.conselho ?? 'Conselho'}`} editando={editando}>
                {editando
                  ? <input value={conselhoNum} onChange={e => setConselhoNum(e.target.value)} placeholder="Digite o número" className={inputCls} style={inputActiveStyle} />
                  : <Val empty="Não informado">{conselhoNum}</Val>}
              </Campo>

              <Campo label="UF do conselho" editando={editando}>
                {editando ? (
                  <select value={conselhoUf} onChange={e => setConselhoUf(e.target.value)} className={inputCls} style={inputActiveStyle}>
                    <option value="">Não informado</option>
                    {UFS_BRASIL.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                  </select>
                ) : <Val empty="Não informado">{conselhoUf}</Val>}
              </Campo>

              <Campo label="Código CBO" editando={editando}>
                {editando
                  ? <input value={cbo} onChange={e => setCbo(e.target.value)} placeholder="Ex: 2238-10" inputMode="numeric" className={inputCls} style={inputActiveStyle} />
                  : <Val empty="Não informado">{cbo}</Val>}
              </Campo>

              <Campo label="Especialidade" editando={editando}>
                {editando
                  ? <input value={especialidade} onChange={e => setEspecialidade(e.target.value)} placeholder="Ex: Integração Sensorial" className={inputCls} style={inputActiveStyle} />
                  : <Val empty="Não informado">{especialidade}</Val>}
              </Campo>

            </div>

            <Campo label="Biografia" editando={editando}>
              {editando ? (
                <textarea
                  value={biografia}
                  onChange={e => setBiografia(e.target.value)}
                  rows={4}
                  placeholder="Apresentação profissional..."
                  className={inputCls}
                  style={{ ...inputActiveStyle, resize: 'vertical' }}
                />
              ) : (
                <div className="text-sm whitespace-pre-wrap" style={{ color: biografia ? 'var(--color-ink)' : 'var(--color-ink-faint)' }}>
                  {biografia || 'Não informado'}
                </div>
              )}
            </Campo>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 px-5 py-3 rounded-2xl text-sm font-medium shadow-xl z-[9999] pointer-events-none"
          style={{ background: 'var(--color-ink)', color: '#fff', whiteSpace: 'nowrap' }}
        >
          {toast}
        </div>
      )}
    </div>
  )
}

/* ── Helpers de layout ── */
function Campo({ label, editando: _editando, children }: { label: string; editando: boolean; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide mb-1.5 font-medium" style={{ color: 'var(--color-ink-faint)' }}>
        {label}
      </div>
      {children}
    </div>
  )
}

function CampoLocked({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide mb-1.5 font-medium" style={{ color: 'var(--color-ink-faint)' }}>
        {label}
      </div>
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm" style={{ color: value ? 'var(--color-ink)' : 'var(--color-ink-faint)' }}>
          {value || 'Não informado'}
        </div>
        <Lock size={13} style={{ color: 'var(--color-ink-faint)', flexShrink: 0 }} />
      </div>
    </div>
  )
}

function Val({ children, empty = '—' }: { children?: string | null; empty?: string }) {
  return (
    <div className="text-sm" style={{ color: children ? 'var(--color-ink)' : 'var(--color-ink-faint)' }}>
      {children || empty}
    </div>
  )
}
