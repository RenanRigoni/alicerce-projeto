import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { PacientesListaTerapeuta } from './PacientesListaTerapeuta'

export default async function TerapiaPacientesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  const { data: vinculos } = await supabase
    .from('paciente_terapeutas')
    .select('pacientes(id, nome, codigo_interno, status, frequencia_atendimento)')
    .eq('terapeuta_id', user.id)

  const todos = (vinculos ?? [])
    .map((v: any) => v.pacientes)
    .filter(Boolean)
    .sort((a: any, b: any) => a.nome.localeCompare(b.nome))

  return <PacientesListaTerapeuta todos={todos} />
}
