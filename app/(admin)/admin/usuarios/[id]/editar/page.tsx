import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { EditarUsuarioForm } from './EditarUsuarioForm'

export default async function EditarUsuarioPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user: me } } = await supabase.auth.getUser()
  const { data: meProfile } = await supabase.from('profiles').select('role').eq('id', me!.id).single()

  if (meProfile?.role !== 'admin' && meProfile?.role !== 'recepcao') redirect('/admin/usuarios')

  const { data: usuario } = await supabase
    .from('profiles')
    .select('id, nome, role, telefone, crefito, tipo_profissional, conselho_tipo, conselho_numero')
    .eq('id', id)
    .single()

  if (!usuario) notFound()

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
      usuario={usuario}
      detalhes={detalhes}
    />
  )
}
