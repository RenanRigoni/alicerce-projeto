import { createClient } from '@/lib/supabase/server'
import { ConfiguracoesTabs } from '@/components/admin/ConfiguracoesTabs'

export default async function ConfiguracoesPage() {
  const supabase = await createClient()

  const [{ data: config }, { data: horarios }] = await Promise.all([
    supabase.from('configuracoes_clinica').select('*').eq('singleton', 'default').single(),
    supabase.from('horarios_funcionamento').select('*').order('dia_semana'),
  ])

  return (
    <div>
      <h1
        className="text-2xl font-semibold mb-6"
        style={{ fontFamily: 'var(--font-lora)', color: 'var(--color-ink)' }}
      >
        Configurações
      </h1>
      <ConfiguracoesTabs config={config} horarios={horarios ?? []} />
    </div>
  )
}
