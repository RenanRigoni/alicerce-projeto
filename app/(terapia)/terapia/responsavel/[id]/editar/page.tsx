import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { EditarResponsavelTerapeutaForm } from './EditarResponsavelTerapeutaForm'
import { temPermissao } from '@/lib/permissoes/definicoes'
import { terapeutaTemVinculoComResponsavel } from '@/lib/paciente/vinculo-responsavel'

export default async function EditarResponsavelTerapeutaPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  const { data: profile } = await supabase.from('profiles').select('role, permissoes').eq('id', user.id).single()
  if (profile?.role !== 'terapeuta') notFound()
  if (!temPermissao(profile.role, (profile.permissoes ?? {}) as Record<string, boolean>, 'gerenciar_responsaveis')) notFound()

  // Verifica que pelo menos um paciente do responsável é do terapeuta
  if (!(await terapeutaTemVinculoComResponsavel(supabase, user.id, id))) notFound()

  const { data: resp } = await supabase
    .from('profiles')
    .select('id, nome')
    .eq('id', id)
    .single()

  if (!resp) notFound()

  const { data: detalhes } = await supabase
    .from('responsaveis_detalhes')
    .select('telefone_principal, endereco, cidade, cep, contato_emergencia')
    .eq('id', id)
    .maybeSingle()

  return (
    <EditarResponsavelTerapeutaForm
      responsavel={{ ...resp, ...(detalhes ?? {}) }}
    />
  )
}
