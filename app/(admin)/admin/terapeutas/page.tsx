import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { formatarConselhoProfissional, getTipoProfissionalConfig } from '@/lib/profissionais'
import { getPerfilPermissoesAtual } from '@/lib/permissoes/verificar'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function ProfissionaisPage() {
  const perfil = await getPerfilPermissoesAtual()
  if (!perfil?.efetivas.gerenciar_usuarios) notFound()
  const podeVerPacientes = perfil.efetivas.ver_todos_pacientes

  const supabase = await createClient()

  const { data: profissionais } = await supabase
    .from('profiles')
    .select(podeVerPacientes
      ? `
        id, nome, ativo, telefone, crefito, tipo_profissional, conselho_tipo, conselho_numero,
        paciente_terapeutas(pacientes(id, nome, codigo_interno, status))
      `
      : 'id, nome, ativo, telefone, crefito, tipo_profissional, conselho_tipo, conselho_numero')
    .eq('role', 'terapeuta')
    .order('nome')

  const lista = (profissionais ?? []).map((p: any) => ({
    id: p.id,
    nome: p.nome,
    ativo: p.ativo,
    telefone: p.telefone,
    tipo: getTipoProfissionalConfig(p.tipo_profissional),
    conselho: formatarConselhoProfissional({
      tipoProfissional: p.tipo_profissional,
      conselhoTipo: p.conselho_tipo,
      conselhoNumero: p.conselho_numero,
      crefitoLegado: p.crefito,
    }),
    pacientes: (p.paciente_terapeutas ?? [])
      .filter((pt: any) => pt.pacientes)
      .map((pt: any) => pt.pacientes),
  }))

  const ativos = lista.filter(p => p.ativo)
  const inativos = lista.filter(p => !p.ativo)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold" style={{ fontFamily: 'var(--font-lora)', color: 'var(--color-ink)' }}>
            Profissionais
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
          + Novo profissional
        </Link>
      </div>

      {lista.length === 0 ? (
        <Card>
          <p className="text-sm" style={{ color: 'var(--color-ink-faint)' }}>Nenhum profissional cadastrado.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {lista.map(p => {
            const pacientesAtivos = p.pacientes.filter((paciente: any) => paciente.status === 'ativo')
            return (
              <Card key={p.id}>
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link href={`/admin/usuarios/${p.id}`} className="font-medium hover:underline" style={{ color: 'var(--color-ink)' }}>{p.nome}</Link>
                      {!p.ativo && <Badge color="gray">Inativo</Badge>}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1">
                      <span className="text-xs" style={{ color: 'var(--color-ink-soft)' }}>
                        {p.tipo.label}
                      </span>
                      {p.conselho && (
                        <span className="text-xs" style={{ color: 'var(--color-ink-soft)' }}>
                          {p.conselho}
                        </span>
                      )}
                      {p.telefone && (
                        <span className="text-xs" style={{ color: 'var(--color-ink-soft)' }}>
                          {p.telefone}
                        </span>
                      )}
                    </div>
                    <div className="mt-2 text-xs" style={{ color: 'var(--color-ink-faint)' }}>
                      {pacientesAtivos.length} paciente{pacientesAtivos.length !== 1 ? 's' : ''} ativo{pacientesAtivos.length !== 1 ? 's' : ''}
                      {p.pacientes.length > pacientesAtivos.length && ` · ${p.pacientes.length - pacientesAtivos.length} com alta/inativo`}
                    </div>
                  </div>

                  {pacientesAtivos.length > 0 && (
                    <div className="flex flex-col gap-1 items-end">
                      {pacientesAtivos.slice(0, 5).map((paciente: any) => (
                        <Link
                          key={paciente.id}
                          href={`/admin/pacientes/${paciente.id}`}
                          className="text-xs transition-opacity hover:opacity-70"
                          style={{ color: 'var(--color-ink-mid)' }}
                        >
                          {paciente.codigo_interno && (
                            <span className="font-mono mr-1" style={{ color: 'var(--color-ink-faint)' }}>#{paciente.codigo_interno}</span>
                          )}
                          {paciente.nome}
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
                  <Link href={`/admin/usuarios/${p.id}`} className="text-xs transition-opacity hover:opacity-70" style={{ color: 'var(--color-sage-main)' }}>
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
