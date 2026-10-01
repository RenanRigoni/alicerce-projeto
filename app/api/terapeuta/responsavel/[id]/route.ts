import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { temPermissao } from '@/lib/permissoes/definicoes'
import { validarCep } from '@/lib/endereco/cep'
import { validarTelefone, validarTelefoneDoContatoEmergencia } from '@/lib/telefone'
import { terapeutaTemVinculoComResponsavel } from '@/lib/paciente/vinculo-responsavel'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: responsavelId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role, permissoes').eq('id', user.id).single()
  if (profile?.role !== 'terapeuta') {
    return NextResponse.json({ error: 'Apenas profissionais podem usar esta rota' }, { status: 403 })
  }
  if (!temPermissao(profile.role, (profile.permissoes ?? {}) as Record<string, boolean>, 'gerenciar_responsaveis')) {
    return NextResponse.json({ error: 'Sem permissão para gerenciar responsáveis' }, { status: 403 })
  }

  // Verifica se o responsável tem ao menos um paciente do terapeuta
  const temVinculo = await terapeutaTemVinculoComResponsavel(supabase, user.id, responsavelId)
  if (!temVinculo) {
    return NextResponse.json({ error: 'Sem permissão para editar este responsável' }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  const { nome, telefone_principal, endereco, cidade, cep, contato_emergencia } = body

  const cepValidado = cep !== undefined ? validarCep(cep) : null
  if (cepValidado && !cepValidado.valido) {
    return NextResponse.json({ error: cepValidado.mensagem }, { status: 400 })
  }

  const telefonePrincipal = telefone_principal !== undefined ? validarTelefone(telefone_principal) : null
  if (telefonePrincipal && !telefonePrincipal.valido) {
    return NextResponse.json({ error: telefonePrincipal.mensagem }, { status: 400 })
  }
  const telefoneEmergencia = validarTelefoneDoContatoEmergencia(contato_emergencia)
  if (!telefoneEmergencia.valido) {
    return NextResponse.json({ error: telefoneEmergencia.mensagem }, { status: 400 })
  }

  if (nome !== undefined && (typeof nome !== 'string' || !nome.trim())) {
    return NextResponse.json({ error: 'Nome não pode estar vazio.' }, { status: 400 })
  }

  const nomeUpdates: Record<string, any> = {}
  if (nome !== undefined) nomeUpdates.nome = nome.trim()

  const detalhesUpdates: Record<string, any> = {}
  if (telefonePrincipal?.valido) detalhesUpdates.telefone_principal = telefonePrincipal.telefone
  if (endereco !== undefined) detalhesUpdates.endereco = endereco || null
  if (cidade !== undefined) detalhesUpdates.cidade = cidade || null
  if (cepValidado?.valido) detalhesUpdates.cep = cepValidado.cep
  if (contato_emergencia !== undefined) detalhesUpdates.contato_emergencia = contato_emergencia || null

  // A autorização acima (profissional + gerenciar_responsaveis + vínculo com um
  // paciente dela) é o controle de acesso. A escrita usa o cliente de serviço
  // porque a RLS de profiles e responsaveis_detalhes só deixa escrever o próprio
  // dono ou admin/recepção: com o cliente da profissional, o UPDATE afetava 0
  // linhas sem erro e a tela dizia "salvo" sem ter salvo nada. O upsert antigo
  // ainda usava uma coluna (responsavel_id) que a tabela não tem.
  const adminClient = createAdminClient()

  if (Object.keys(nomeUpdates).length > 0) {
    const { error } = await adminClient.from('profiles').update(nomeUpdates).eq('id', responsavelId).eq('role', 'pai')
    if (error) return NextResponse.json({ error: 'Erro ao atualizar nome' }, { status: 500 })
  }

  if (Object.keys(detalhesUpdates).length > 0) {
    const { error } = await adminClient
      .from('responsaveis_detalhes')
      .upsert({ id: responsavelId, ...detalhesUpdates }, { onConflict: 'id' })
    if (error) return NextResponse.json({ error: 'Erro ao atualizar detalhes' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
