import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
export const dynamic = 'force-dynamic'

export default async function TerapeutasPage() {
  const supabase = await createClient()

  const { data: terapeutas } = await supabase
    .from('profiles')
    .select(`
      id, nome, ativo, telefone, crefito,
      paciente_terapeutas(pacientes(id, nome, codigo_interno, status))
    `)
    .eq('role', 'terapeuta')
    .order('nome')

  const lista = (terapeutas ?? []).map((t: any) => ({
    id: t.id,
    nome: t.nome,
    ativo: t.ativo,
    telefone: t.telefone,
    crefito: t.crefito,
    pacientes: (t.paciente_terapeutas ?? [])
      .filter((pt: any) => pt.pacientes)
      .map((pt: any) => pt.pacientes),
  }))

  const ativos = lista.filter(t => t.ativo)
  const inativos = lista.filter(t => !t.ativo)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold" style={{ fontFamily: 'var(--font-lora)', color: 'var(--color-ink)' }}>
            Terapeutas
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-ink-soft)' }}>
            {ativos.length} ativo{ativos.length !== 1 ? 's' : ''}{inativos.length > 0 ? ` · ${inativos.length} inativo${inativos.length !== 1 ? 's' : ''}` : ''}
          </p>
        </div>
        <Link
          href="/admin/usuarios/novo"
          className="text-sm font-medium px-4 py-2 rounded-xl text-white transition-all duration-200"
          style={{ background: 'var(--color-sage-main)' }}
        >
          + Novo terapeuta
        </Link>
      </div>

      {lista.length === 0 ? (
        <Card>
          <p className="text-sm" style={{ color: 'var(--color-ink-faint)' }}>Nenhum terapeuta cadastrado.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {lista.map(t => {
            const pacientesAtivos = t.pacientes.filter((p: any) => p.status === 'ativo')
            return (
              <Card key={t.id}>
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link href={`/admin/usuarios/${t.id}`} className="font-medium hover:underline" style={{ color: 'var(--color-ink)' }}>{t.nome}</Link>
                      {!t.ativo && <Badge color="gray">Inativo</Badge>}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1">
                      {t.crefito && (
                        <span className="text-xs" style={{ color: 'var(--color-ink-soft)' }}>
                          {t.crefito}
                        </span>
                      )}
                      {t.telefone && (
                        <span className="text-xs" style={{ color: 'var(--color-ink-soft)' }}>
                          {t.telefone}
                        </span>
                      )}
                    </div>
                    <div className="mt-2 text-xs" style={{ color: 'var(--color-ink-faint)' }}>
                      {pacientesAtivos.length} paciente{pacientesAtivos.length !== 1 ? 's' : ''} ativo{pacientesAtivos.length !== 1 ? 's' : ''}
                      {t.pacientes.length > pacientesAtivos.length && ` · ${t.pacientes.length - pacientesAtivos.length} com alta/inativo`}
                    </div>
                  </div>

                  {/* Pacientes ativos vinculados */}
                  {pacientesAtivos.length > 0 && (
                    <div className="flex flex-col gap-1 items-end">
                      {pacientesAtivos.slice(0, 5).map((p: any) => (
                        <Link
                          key={p.id}
                          href={`/admin/pacientes/${p.id}`}
                          className="text-xs transition-opacity hover:opacity-70"
                          style={{ color: 'var(--color-ink-mid)' }}
                        >
                          {p.codigo_interno && (
                            <span className="font-mono mr-1" style={{ color: 'var(--color-ink-faint)' }}>#{p.codigo_interno}</span>
                          )}
                          {p.nome}
                        </Link>
                      ))}
                      {pacientesAtivos.length > 5 && (
                        <span className="text-xs" style={{ color: 'var(--color-ink-faint)' }}>
                          +{pacientesAtivos.length - 5} mais
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="mt-3 pt-3 border-t flex justify-end" style={{ borderColor: 'var(--color-border-soft)' }}>
                  <Link
                    href={`/admin/usuarios/${t.id}`}
                    className="text-xs transition-opacity hover:opacity-70"
                    style={{ color: 'var(--color-sage-main)' }}
                  >
                    Ver perfil completo →
                  </Link>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
