import { createClient } from '@/lib/supabase/server'
import { getPerfilPermissoesAtual } from '@/lib/permissoes/verificar'
import { Card } from '@/components/ui/Card'
import { notFound } from 'next/navigation'
import { FeriadoForm } from './FeriadoForm'

export default async function FeriadosPage() {
  const perfil = await getPerfilPermissoesAtual()
  if (!perfil?.efetivas.gerenciar_feriados) notFound()

  const supabase = await createClient()

  const { data: feriados } = await supabase
    .from('feriados')
    .select('id, data, descricao, anual')
    .order('data', { ascending: true })

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h1
          className="text-2xl font-semibold"
          style={{ fontFamily: 'var(--font-lora)', color: 'var(--color-ink)' }}
        >
          Feriados
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--color-ink-soft)' }}>
          Datas sem atendimento na clínica
        </p>
      </div>

      <FeriadoForm />

      <Card>
        {feriados && feriados.length > 0 ? (
          <ul className="divide-y" style={{ borderColor: 'var(--color-border-soft)' }}>
            {feriados.map((f: any) => (
              <li key={f.id} className="py-3 flex items-center justify-between first:pt-0 last:pb-0">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium" style={{ color: 'var(--color-ink)' }}>{(f as any).descricao}</span>
                    {(f as any).anual && (
                      <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: 'var(--color-rose-blush)', color: 'var(--color-rose-deep)' }}>
                        Anual
                      </span>
                    )}
                  </div>
                  <div className="text-sm" style={{ color: 'var(--color-ink-soft)' }}>
                    {new Date((f as any).data + 'T12:00:00').toLocaleDateString('pt-BR', {
                      weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
                    })}
                  </div>
                </div>
                <ExcluirFeriadoButton feriadoId={(f as any).id} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm" style={{ color: 'var(--color-ink-faint)' }}>
            Nenhum feriado cadastrado.
          </p>
        )}
      </Card>
    </div>
  )
}

function ExcluirFeriadoButton({ feriadoId }: { feriadoId: string }) {
  return (
    <a
      href={`/admin/feriados/${feriadoId}/excluir`}
      className="text-xs transition-colors hover:opacity-80"
      style={{ color: 'var(--color-ink-faint)' }}
    >
      Excluir
    </a>
  )
}
