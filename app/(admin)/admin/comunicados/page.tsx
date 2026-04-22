import { createClient } from '@/lib/supabase/server'
import { Card } from '@/components/ui/Card'
import { NovoComunicadoForm } from './NovoComunicadoForm'

export default async function ComunicadosPage() {
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

      <div className="space-y-3">
        {comunicados && comunicados.length > 0 ? comunicados.map((c: any) => (
          <Card key={c.id}>
            <div className="font-medium mb-1" style={{ color: 'var(--color-ink)' }}>{c.titulo}</div>
            <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--color-ink-mid)' }}>{c.conteudo}</p>
            <div className="text-xs mt-2" style={{ color: 'var(--color-ink-faint)' }}>
              {c.profiles?.nome ?? '—'} · {new Date(c.criado_em).toLocaleDateString('pt-BR', {
                day: '2-digit', month: 'long', year: 'numeric',
              })}
            </div>
          </Card>
        )) : (
          <Card>
            <p className="text-sm" style={{ color: 'var(--color-ink-faint)' }}>
              Nenhum comunicado publicado ainda.
            </p>
          </Card>
        )}
      </div>
    </div>
  )
}
