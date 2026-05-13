import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import { PerfilPacienteTabs } from '@/components/paciente/PerfilPacienteTabs'
import { RegistrarAltaButton } from '@/components/terapia/RegistrarAltaButton'
import { ConfirmarAltaButton } from '@/components/terapia/ConfirmarAltaButton'
import { todasPermissoes, temPermissao } from '@/lib/permissoes/definicoes'

export default async function PacienteTerapeutaPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, permissoes')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'terapeuta') notFound()

  const permissoesEfetivas = todasPermissoes(profile.role, (profile.permissoes ?? {}) as Record<string, boolean>)
  const podeVerTodosPacientes = temPermissao(profile.role, (profile.permissoes ?? {}) as Record<string, boolean>, 'ver_todos_pacientes')
  const podeVerRelatoriosTodos = temPermissao(profile.role, (profile.permissoes ?? {}) as Record<string, boolean>, 'ver_relatorios_todos')

  const { data: meuVinculo } = await supabase
    .from('paciente_terapeutas')
    .select('terapeuta_id')
    .eq('paciente_id', id)
    .eq('terapeuta_id', user.id)
    .maybeSingle()

  const ehTerapeutaVinculado = !!meuVinculo
  if (!ehTerapeutaVinculado && !podeVerTodosPacientes) notFound()

  const adminClient = createAdminClient()
  const dbPaciente = ehTerapeutaVinculado ? supabase : adminClient
  const podeLerClinico = ehTerapeutaVinculado || podeVerRelatoriosTodos
  const dbClinico = podeLerClinico ? dbPaciente : null

  const [
    { data: paciente },
    { data: terapeutasVinculo },
    { data: responsaveisVinculo },
    { data: dadosClinicos },
    { data: relatorios },
    { data: evolucoes },
    { data: documentos },
    { data: orientacoes },
    { data: altas },
    { data: altaAtual },
  ] = await Promise.all([
    dbPaciente.from('pacientes').select('*').eq('id', id).single(),
    dbPaciente
      .from('paciente_terapeutas')
      .select('profiles(id, nome)')
      .eq('paciente_id', id),
    dbPaciente
      .from('paciente_responsaveis')
      .select('tipo, profiles(id, nome, responsaveis_detalhes(endereco, cidade, cep, telefone_principal))')
      .eq('paciente_id', id),
    dbClinico ? dbClinico
      .from('pacientes_dados_clinicos')
      .select('*')
      .eq('paciente_id', id)
      .maybeSingle() : Promise.resolve({ data: null }),
    dbClinico ? dbClinico
      .from('relatorios')
      .select('id, identificacao, status, publicado_em, criado_em, conclusao, pdf_url')
      .eq('paciente_id', id)
      .order('criado_em', { ascending: false }) : Promise.resolve({ data: [] }),
    dbClinico ? dbClinico
      .from('evolucoes')
      .select('id, identificacao, status, publicado_em, criado_em, conclusao, pdf_url')
      .eq('paciente_id', id)
      .order('criado_em', { ascending: false }) : Promise.resolve({ data: [] }),
    dbClinico ? dbClinico
      .from('documentos')
      .select('id, tipo, descricao, visivel_pais, criado_em, arquivo_url')
      .eq('paciente_id', id)
      .order('criado_em', { ascending: false }) : Promise.resolve({ data: [] }),
    dbClinico ? dbClinico
      .from('orientacoes')
      .select('id, titulo, tipo, url_midia, conteudo, criado_em')
      .eq('paciente_id', id)
      .order('criado_em', { ascending: false }) : Promise.resolve({ data: [] }),
    dbClinico ? dbClinico
      .from('solicitacoes_alta')
      .select('id, status, tipo, motivo, documento_url, argumentacao_recusa, criado_em, profiles!solicitacoes_alta_solicitado_por_fkey(nome)')
      .eq('paciente_id', id)
      .order('criado_em', { ascending: false }) : Promise.resolve({ data: [] }),
    ehTerapeutaVinculado ? supabase
      .from('solicitacoes_alta')
      .select('id, status, tipo, motivo, documento_url')
      .eq('paciente_id', id)
      .eq('status', 'pendente_confirmacao')
      .order('criado_em', { ascending: false })
      .limit(1)
      .maybeSingle() : Promise.resolve({ data: null }),
  ])

  if (!paciente) notFound()

  // CPF Phase 2: tenta decifrar; cai no plaintext se chave não configurada
  const { data: cpfDecifrado } = await dbPaciente.rpc('get_paciente_cpf', { p_patient_id: id })

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
    tipo: a.tipo ?? 'terapeuta',
    motivo: a.motivo,
    documento_url: a.documento_url ?? null,
    argumentacao_recusa: a.argumentacao_recusa,
    criado_em: a.criado_em,
    solicitado_por_nome: a.profiles?.nome ?? null,
  }))

  return (
    <div className="space-y-4">
      <PerfilPacienteTabs
        paciente={{
          id: paciente.id,
          nome: paciente.nome,
          codigo_interno: paciente.codigo_interno,
          foto_url: paciente.foto_url,
          data_nascimento: paciente.data_nascimento,
          sexo: paciente.sexo,
          cpf: cpfDecifrado as string | null,
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
        evolucoes={evolucoes ?? []}
        documentos={documentos ?? []}
        orientacoes={orientacoes ?? []}
        altas={altasMapped}
        role="terapeuta"
        ehTerapeutaVinculado={ehTerapeutaVinculado}
        permissoes={permissoesEfetivas}
      />

      {ehTerapeutaVinculado && altaAtual && (
        <div className="pt-2">
          <ConfirmarAltaButton
            altaId={altaAtual.id}
            pacienteNome={paciente.nome}
            motivo={altaAtual.motivo}
            documentoUrl={altaAtual.documento_url}
          />
        </div>
      )}

      {ehTerapeutaVinculado && permissoesEfetivas.registrar_alta && paciente.status === 'ativo' && !altaAtual && (
        <div className="pt-2">
          <RegistrarAltaButton pacienteId={id} pacienteNome={paciente.nome} />
        </div>
      )}
    </div>
  )
}
