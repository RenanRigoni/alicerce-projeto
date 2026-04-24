import { createClient } from '@/lib/supabase/server'
import { PacientesLista } from './PacientesLista'

export default async function PacientesPage() {
  const supabase = await createClient()

  const { data } = await supabase
    .from('pacientes')
    .select('id, nome, codigo_interno, status, frequencia_atendimento, criado_em')
    .order('nome')

  return <PacientesLista todos={data ?? []} />
}
