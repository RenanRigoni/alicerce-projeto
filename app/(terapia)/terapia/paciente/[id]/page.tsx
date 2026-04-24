import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { PerfilPacienteTabs } from '@/components/paciente/PerfilPacienteTabs'
import { SolicitarAltaButton } from '@/components/terapia/SolicitarAltaButton'

export default async function PacienteTerapeutaPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  const [
    { data: paciente },
    { data: terapeutasVinculo },
    { data: responsaveisVinculo },
    { data: dadosClinicos },
    { data: relatorios },
    { data: documentos },
    { data: orientacoes },
    { data: altas },
    { data: meuVinculo },
    { data: altaAtual },
  ] = await Promise.all([
    supabase.from('pacientes').select('*').eq('id', id).single(),
    supabase
      .from('paciente_terapeutas')
      .select('profiles(id, nome)')
      .eq('paciente_id', id),
    supabase
      .from('paciente_responsaveis')
      .select('tipo, profiles(id, nome, responsaveis_detalhes(endereco, cidade, cep, telefone_principal))')
      .eq('paciente_id', id),
    supabase
      .from('pacientes_dados_clinicos')
      .select('*')
      .eq('paciente_id', id)
      .maybeSingle(),
    supabase
      .from('relatorios')
      .select('id, identificacao, status, publicado_em, criado_em, conclusao, pdf_url')
      .eq('paciente_id', id)
      .order('criado_em', { ascending: false }),
    supabase
      .from('documentos')
      .select('id, tipo, descricao, visivel_pais, criado_em, arquivo_url')
      .eq('paciente_id', id)
      .order('criado_em', { ascending: false }),
    supabase
      .from('orientacoes')
      .select('id, titulo, tipo, url_midia, conteudo, criado_em')
      .eq('paciente_id', id)
      .order('criado_em', { ascending: false }),
    supabase
      .from('solicitacoes_alta')
      .select('id, status, motivo, argumentacao_recusa, criado_em, profiles!solicitacoes_alta_solicitado_por_fkey(nome)')
      .eq('paciente_id', id)
      .order('criado_em', { ascending: false }),
    supabase
      .from('paciente_terapeutas')
      .select('terapeuta_id')
      .eq('paciente_id', id)
      .eq('terapeuta_id', user.id)
      .maybeSingle(),
    supabase
      .from('solicitacoes_alta')
      .select('id, status, argumentacao_recusa')
      .eq('paciente_id', id)
      .in('status', ['pendente', 'recusada'])
      .order('criado_em', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  if (!paciente) notFound()

  const ehTerapeutaVinculado = !!meuVinculo

  const terapeutas = (terapeutasVinculo ?? []).map((t: any) => ({
    id: t.profiles.id,
    nome: t.profiles.nome,
  }))

  const responsaveis = (responsaveisVinculo ?? [])
    .filter((r: any) => r.profiles)
    .map((r: any) => ({
      id: r.profiles.id,
      nome: r.profiles.nome,
      tipo: r.tipo as 'principal' | 'secundario',
      endereco: r.profiles.responsaveis_detalhes?.endereco ?? null,
      cidade: r.profiles.responsaveis_detalhes?.cidade ?? null,
      cep: r.profiles.responsaveis_detalhes?.cep ?? null,
      telefone_principal: r.profiles.responsaveis_detalhes?.telefone_principal ?? null,
    }))

  const altasMapped = (altas ?? []).map((a: any) => ({
    id: a.id,
    status: a.status,
    motivo: a.motivo,
    argumentacao_recusa: a.argumentacao_recusa,
    criado_em: a.criado_em,
    solicitado_por_nome: a.profiles?.nome ?? null,
  }))

  return (
    <div className="space-y-4">
      {/* Alerta de alta recusada */}
      {altaAtual?.status === 'recusada' && (
        <div
          className="rounded-xl px-4 py-3 text-sm"
          style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C' }}
        >
          <strong>Alta recusada pela administração.</strong>{' '}
          {altaAtual.argumentacao_recusa && <>Motivo: {altaAtual.argumentacao_recusa}</>}
        </div>
      )}

      {/* Alerta de alta pendente */}
      {altaAtual?.status === 'pendente' && (
        <div
          className="rounded-xl px-4 py-3 text-sm"
          style={{ background: '#FFFBEB', border: '1px solid #FDE68A', color: '#92400E' }}
        >
          Solicitação de alta enviada — aguardando aprovação da administração.
        </div>
      )}

      <PerfilPacienteTabs
        paciente={{
          id: paciente.id,
          nome: paciente.nome,
          codigo_interno: paciente.codigo_interno,
          foto_url: paciente.foto_url,
          data_nascimento: paciente.data_nascimento,
          sexo: paciente.sexo,
          cpf: paciente.cpf,
          status: paciente.status,
          motivo_desativacao: paciente.motivo_desativacao,
          data_inicio: paciente.data_inicio,
          frequencia_atendimento: paciente.frequencia_atendimento,
          horarios_atendimento: paciente.horarios_atendimento ?? [],
          turno_preferencia: paciente.turno_preferencia,
          convenio_ou_particular: paciente.convenio_ou_particular,
        }}
        terapeutas={terapeutas}
        responsaveis={responsaveis}
        dadosClinicos={dadosClinicos ?? null}
        relatorios={relatorios ?? []}
        documentos={documentos ?? []}
        orientacoes={orientacoes ?? []}
        altas={altasMapped}
        role="terapeuta"
        meuId={user.id}
        ehTerapeutaVinculado={ehTerapeutaVinculado}
      />

      {/* Botão de solicitar alta (fora das tabs para ficar sempre visível) */}
      {ehTerapeutaVinculado && paciente.status === 'ativo' && !altaAtual && (
        <div className="pt-2">
          <SolicitarAltaButton pacienteId={id} pacienteNome={paciente.nome} />
        </div>
      )}
    </div>
  )
}
