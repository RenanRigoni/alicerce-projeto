import { createClient } from '@/lib/supabase/server'
import { getPerfilPermissoesAtual } from '@/lib/permissoes/verificar'
import { notFound } from 'next/navigation'
import { NovoComunicadoForm } from './NovoComunicadoForm'
import { ComunicadosList } from './ComunicadosList'

export default async function ComunicadosPage() {
  const perfil = await getPerfilPermissoesAtual()
  if (!perfil?.efetivas.criar_comunicados) notFound()

  const supabase = await createClient()

  const { data: comunicados } = await supabase
    .from('comunicados')
    .select('id, titulo, conteudo, criado_em, profiles(nome)')
    .order('criado_em', { ascending: false })

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1
          className="text-2xl font-semibold"
          style={{ fontFamily: 'var(--font-lora)', color: 'var(--color-ink)' }}
        >
          Comunicados
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--color-ink-soft)' }}>
          Mensagens enviadas para todos os usuários
        </p>
      </div>

      <NovoComunicadoForm />

      <ComunicadosList comunicados={(comunicados ?? []) as any} />
    </div>
  )
}
