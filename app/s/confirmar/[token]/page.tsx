import { createAdminClient } from '@/lib/supabase/admin'

interface Props {
  params: Promise<{ token: string }>
}

function formatarDataHora(iso: string) {
  const dt = new Date(iso)
  return {
    data: dt.toLocaleDateString('pt-BR', {
      weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
      timeZone: 'America/Sao_Paulo',
    }),
    hora: dt.toLocaleTimeString('pt-BR', {
      hour: '2-digit', minute: '2-digit',
      timeZone: 'America/Sao_Paulo',
    }),
  }
}

export default async function ConfirmarPage({ params }: Props) {
  const { token } = await params
  const adminClient = createAdminClient()
  const agora = new Date()
  const agoraISO = agora.toISOString()

  const { data: conf } = await adminClient
    .from('sessao_confirmacoes')
    .select('paciente_id, data_hora, status, expira_em')
    .eq('token', token)
    .maybeSingle()

  if (!conf) {
    return <Resultado tipo="nao_encontrado" />
  }

  const isExpired = new Date(conf.expira_em) <= agora

  if (conf.status === 'confirmada') {
    const { data: pac } = await adminClient.from('pacientes').select('nome').eq('id', conf.paciente_id).single()
    const { data, hora } = formatarDataHora(conf.data_hora)
    return <Resultado tipo="ja_confirmado" paciente={pac?.nome} data={data} hora={hora} />
  }

  if (isExpired || conf.status === 'expirada') {
    await adminClient
      .from('sessao_confirmacoes')
      .update({ status: 'expirada' })
      .eq('token', token)
      .in('status', ['pendente', 'cancelada'])
    const { data: pac } = await adminClient.from('pacientes').select('nome').eq('id', conf.paciente_id).single()
    const { data, hora } = formatarDataHora(conf.data_hora)
    return <Resultado tipo="expirado" paciente={pac?.nome} data={data} hora={hora} />
  }

  // Confirma atomicamente — aceita pendente ou cancelada (pai pode mudar de ideia antes do prazo)
  const { data: updated } = await adminClient
    .from('sessao_confirmacoes')
    .update({ status: 'confirmada', respondido_em: agoraISO })
    .eq('token', token)
    .in('status', ['pendente', 'cancelada'])
    .select('paciente_id, data_hora')
    .maybeSingle()

  const alvo = updated ?? conf
  const { data: pac } = await adminClient.from('pacientes').select('nome').eq('id', alvo.paciente_id).single()
  const { data, hora } = formatarDataHora(alvo.data_hora)

  return <Resultado tipo="confirmado" paciente={pac?.nome} data={data} hora={hora} />
}

function Resultado({
  tipo,
  paciente,
  data,
  hora,
}: {
  tipo: 'confirmado' | 'ja_confirmado' | 'ja_cancelado' | 'cancelado' | 'expirado' | 'nao_encontrado'
  paciente?: string
  data?: string
  hora?: string
}) {
  const configs = {
    confirmado: {
      emoji: '✅',
      titulo: 'Presença confirmada!',
      mensagem: 'Ótimo! Aguardamos vocês na sessão.',
      cor: '#22c55e',
      fundo: '#f0fdf4',
      borda: '#bbf7d0',
    },
    ja_confirmado: {
      emoji: '✅',
      titulo: 'Sessão já confirmada',
      mensagem: 'Esta sessão já foi confirmada anteriormente.',
      cor: '#22c55e',
      fundo: '#f0fdf4',
      borda: '#bbf7d0',
    },
    ja_cancelado: {
      emoji: '❌',
      titulo: 'Sessão cancelada',
      mensagem: 'Esta sessão já foi cancelada. Se precisar remarcar, entre em contato com a clínica.',
      cor: '#ef4444',
      fundo: '#fef2f2',
      borda: '#fecaca',
    },
    cancelado: {
      emoji: '❌',
      titulo: 'Sessão cancelada',
      mensagem: 'Sessão cancelada com sucesso. Se precisar remarcar, entre em contato com a clínica.',
      cor: '#ef4444',
      fundo: '#fef2f2',
      borda: '#fecaca',
    },
    expirado: {
      emoji: '⚠️',
      titulo: 'Link expirado',
      mensagem: 'O prazo para confirmação encerrou. A sessão foi confirmada automaticamente e será cobrada normalmente.',
      cor: '#f59e0b',
      fundo: '#fffbeb',
      borda: '#fde68a',
    },
    nao_encontrado: {
      emoji: '🔍',
      titulo: 'Link inválido',
      mensagem: 'Este link não existe ou já foi utilizado. Entre em contato com a clínica.',
      cor: '#6b7280',
      fundo: '#f9fafb',
      borda: '#e5e7eb',
    },
  }

  const c = configs[tipo]

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: '#fdf8f6' }}
    >
      <div
        className="max-w-sm w-full rounded-2xl p-8 text-center space-y-4"
        style={{
          background: c.fundo,
          border: `1.5px solid ${c.borda}`,
          boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
        }}
      >
        <div className="text-5xl">{c.emoji}</div>

        <div>
          <h1
            className="text-xl font-semibold"
            style={{ color: c.cor, fontFamily: 'var(--font-lora)' }}
          >
            {c.titulo}
          </h1>
        </div>

        {paciente && data && hora && (
          <div
            className="rounded-xl p-4 text-sm space-y-1"
            style={{ background: 'rgba(255,255,255,0.7)', color: '#374151' }}
          >
            <div className="font-semibold" style={{ color: '#111827' }}>{paciente}</div>
            <div className="capitalize">{data}</div>
            <div className="font-medium">{hora}</div>
          </div>
        )}

        <p className="text-sm" style={{ color: '#6b7280' }}>
          {c.mensagem}
        </p>

        <div className="pt-2">
          <div
            className="text-xs"
            style={{ color: '#9ca3af' }}
          >
            Alicerce — Espaço Terapêutico
          </div>
        </div>
      </div>
    </div>
  )
}
