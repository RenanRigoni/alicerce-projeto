import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { notFound, redirect } from 'next/navigation'
import { EditarUsuarioForm } from './EditarUsuarioForm'
import { getPerfilPermissoesAtual } from '@/lib/permissoes/verificar'

export default async function EditarUsuarioPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const adminClient = createAdminClient()

  const perfilAtual = await getPerfilPermissoesAtual()
  if (!perfilAtual) redirect('/login')

  const { data: usuario } = await supabase
    .from('profiles')
    .select('id, nome, role, telefone, crefito, cpf_cnpj, tipo_profissional, conselho_tipo, conselho_numero, conselho_uf, cbo_codigo')
    .eq('id', id)
    .single()

  if (!usuario) notFound()

  const podeGerenciarUsuarios = perfilAtual.efetivas.gerenciar_usuarios === true
  const podeGerenciarEsteResponsavel = usuario.role === 'pai' && perfilAtual.efetivas.gerenciar_responsaveis === true
  if (!podeGerenciarUsuarios && !podeGerenciarEsteResponsavel) notFound()

  if (perfilAtual.role === 'recepcao' && podeGerenciarUsuarios && !['terapeuta', 'pai'].includes(usuario.role)) {
    notFound()
  }

  const { data: authUser } = await adminClient.auth.admin.getUserById(id)

  let detalhes: { endereco: string | null; cidade: string | null; cep: string | null; telefone_principal: string | null; contato_emergencia: string | null } | null = null

  if (usuario.role === 'pai') {
    const { data } = await supabase
      .from('responsaveis_detalhes')
      .select('endereco, cidade, cep, telefone_principal, contato_emergencia')
      .eq('id', id)
      .maybeSingle()
    detalhes = data ?? null
  }

  return (
    <EditarUsuarioForm
      usuario={{ ...usuario, email: authUser.user?.email ?? '' }}
      detalhes={detalhes}
    />
  )
}
