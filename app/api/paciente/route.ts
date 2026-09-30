import { createClient as createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { temPermissao } from '@/lib/permissoes/definicoes'
import { distribuirHorariosPorTerapeuta } from '@/lib/agenda/horarios-fixos'

export async function POST(request: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, permissoes')
    .eq('id', user.id)
    .single()

  if (!profile || !temPermissao(profile.role, (profile.permissoes ?? {}) as Record<string, boolean>, 'cadastrar_pacientes')) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const body = await request.json()
  const {
    nome, data_nascimento, sexo, cpf,
    frequencia_atendimento, turno_preferencia,
    convenio_ou_particular, horarios_atendimento,
    terapeutas, responsavel_id,
  } = body
  const isTerapeuta = profile.role === 'terapeuta'
  const permissoes = (profile.permissoes ?? {}) as Record<string, boolean>
  const podeGerenciarResponsaveis = temPermissao(profile.role, permissoes, 'gerenciar_responsaveis')
  const podeVincularTerapeutas = temPermissao(profile.role, permissoes, 'vincular_terapeutas')

  if (!nome?.trim()) {
    return NextResponse.json({ error: 'Nome é obrigatório.' }, { status: 400 })
  }

  if (responsavel_id && !podeGerenciarResponsaveis) {
    return NextResponse.json({ error: 'Sem permissão para vincular responsável.' }, { status: 403 })
  }

  const terapeutasParaVincular: string[] = isTerapeuta
    ? Array.from(new Set([
        user.id,
        ...(podeVincularTerapeutas && Array.isArray(terapeutas) ? terapeutas : []),
      ]))
    : (podeVincularTerapeutas && Array.isArray(terapeutas) ? terapeutas : [])

  // O horário fixo vive no vínculo, por profissional. Valida antes de criar o paciente
  // para não deixar cadastro pela metade. O resumo em pacientes.horarios_atendimento é
  // mantido por trigger no banco; nada aqui escreve nele.
  const distribuicao = distribuirHorariosPorTerapeuta(horarios_atendimento, terapeutasParaVincular)
  if (!distribuicao.ok) {
    return NextResponse.json({ error: distribuicao.erro }, { status: 400 })
  }

  const adminClient = createAdminClient()

  // Confere o responsável ANTES de criar o paciente: um id inexistente (ou que
  // não seja um responsável) só falharia depois, com o paciente já gravado.
  if (responsavel_id) {
    const { data: alvo } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', responsavel_id)
      .maybeSingle()

    if (!alvo) {
      return NextResponse.json({ error: 'Responsável não encontrado.' }, { status: 400 })
    }
    if (alvo.role !== 'pai') {
      return NextResponse.json({ error: 'O usuário escolhido não tem perfil de responsável.' }, { status: 400 })
    }
  }

  // Criptografa CPF se chave configurada (LGPD Art. 46)
  let cpfCifrado: string | null = null
  const cpfPlain = cpf?.trim() || null
  if (cpfPlain) {
    const { data: enc } = await adminClient.rpc('encrypt_cpf', { cpf_plain: cpfPlain }).maybeSingle()
    cpfCifrado = (enc as string | null) ?? null
  }

  const { data: paciente, error: erroPaciente } = await adminClient
    .from('pacientes')
    .insert({
      nome: nome.trim(),
      data_nascimento: data_nascimento || null,
      sexo: sexo || null,
      cpf_cifrado: cpfCifrado,
      frequencia_atendimento: frequencia_atendimento?.trim() || null,
      turno_preferencia: turno_preferencia || null,
      convenio_ou_particular: convenio_ou_particular || null,
    })
    .select('id')
    .single()

  if (erroPaciente || !paciente) {
    return NextResponse.json({ error: 'Erro ao cadastrar paciente.' }, { status: 500 })
  }

  const pacienteId = paciente.id

  // Os dois vínculos são tentados sempre, e cada falha é reportada. Antes o
  // erro era ignorado: o paciente nascia sem responsável ou sem profissional e
  // a tela dizia que tinha dado tudo certo.
  const falhas: string[] = []

  // Vincula responsável se informado
  if (responsavel_id) {
    const { error } = await adminClient.from('paciente_responsaveis').insert({
      paciente_id: pacienteId,
      responsavel_id,
      tipo: 'principal',
    })
    if (error) falhas.push('o responsável')
  }

  // Vincula terapeutas se informados. Profissional sem permissão de vínculo sempre vincula a si mesmo.
  if (terapeutasParaVincular.length > 0) {
    const { error } = await adminClient.from('paciente_terapeutas').insert(
      terapeutasParaVincular.map((tid: string) => ({
        paciente_id: pacienteId,
        terapeuta_id: tid,
        horarios_atendimento: distribuicao.porTerapeuta.get(tid) ?? [],
      }))
    )
    if (error) falhas.push('a profissional')
  }

  // O paciente existe; não é desfeito (é registro clínico, com auditoria).
  // O paciente_id vai junto para a tela levar a recepção até ele em vez de
  // deixá-la reenviar o formulário e duplicar o cadastro.
  if (falhas.length > 0) {
    return NextResponse.json(
      {
        error: `O paciente foi cadastrado, mas não foi possível vincular ${falhas.join(' nem ')}. Abra o cadastro do paciente e faça o vínculo manualmente.`,
        paciente_id: pacienteId,
      },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true, paciente_id: pacienteId })
}
