import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { temPermissao } from '@/lib/permissoes/definicoes'
import { NovoPacienteTerapeutaForm } from './NovoPacienteTerapeutaForm'

export default async function NovoPacienteTerapeutaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, permissoes')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'terapeuta') notFound()

  const podeCadastrar = temPermissao(
    profile.role,
    (profile.permissoes ?? {}) as Record<string, boolean>,
    'cadastrar_pacientes',
  )

  if (!podeCadastrar) notFound()

  return <NovoPacienteTerapeutaForm />
}
