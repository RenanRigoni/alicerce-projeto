import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { EditarResponsavelTerapeutaForm } from './EditarResponsavelTerapeutaForm'

export default async function EditarResponsavelTerapeutaPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'terapeuta') notFound()

  // Verifica que pelo menos um paciente do responsável é do terapeuta
  const { data: meusPacientes } = await supabase
    .from('paciente_terapeutas')
    .select('paciente_id')
    .eq('terapeuta_id', user.id)

  const meusIds = (meusPacientes ?? []).map((p: any) => p.paciente_id)

  const { data: vinculo } = await supabase
    .from('paciente_responsaveis')
    .select('responsavel_id')
    .eq('responsavel_id', id)
    .in('paciente_id', meusIds.length > 0 ? meusIds : [''])
    .maybeSingle()

  if (!vinculo) notFound()

  const { data: resp } = await supabase
    .from('profiles')
    .select('id, nome')
    .eq('id', id)
    .single()

  if (!resp) notFound()

  const { data: detalhes } = await supabase
    .from('responsaveis_detalhes')
    .select('telefone_principal, endereco, cidade, cep, contato_emergencia')
    .eq('responsavel_id', id)
    .maybeSingle()

  return (
    <EditarResponsavelTerapeutaForm
      responsavel={{ ...resp, ...(detalhes ?? {}) }}
    />
  )
}
