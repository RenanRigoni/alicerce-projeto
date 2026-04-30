import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'

const roleLabel: Record<string, string> = {
  admin: 'Admin',
  recepcao: 'Recepção',
  terapeuta: 'Terapeuta',
  pai: 'Família',
}

const roleColor: Record<string, 'blue' | 'yellow' | 'green' | 'rose' | 'gray'> = {
  admin:     'blue',
  recepcao:  'yellow',
  terapeuta: 'green',
  pai:       'rose',
}

const filtros = [
  { label: 'Todos',      role: null },
  { label: 'Famílias',   role: 'pai' },
  { label: 'Terapeutas', role: 'terapeuta' },
  { label: 'Recepção',   role: 'recepcao' },
  { label: 'Admin',      role: 'admin' },
]

export default async function UsuariosPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string }>
}) {
  const { role: filtroRole } = await searchParams
  const supabase = await createClient()

  let query = supabase
    .from('profiles')
    .select('id, nome, role, criado_em')
    .order('nome')

  if (filtroRole) {
    query = query.eq('role', filtroRole)
  }

  const { data: usuarios } = await query

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-2xl font-semibold"
            style={{ fontFamily: 'var(--font-lora)', color: 'var(--color-ink)' }}
          >
            Usuários
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-ink-soft)' }}>
            Gerencie famílias, terapeutas e equipe
          </p>
        </div>
        <Link
          href="/admin/usuarios/novo"
          className="text-sm font-medium px-4 py-2 rounded-xl text-white transition-all duration-200 active:scale-[0.98]"
          style={{ background: 'var(--color-rose-main)' }}
        >
          + Novo usuário
        </Link>
      </div>

      {/* Filtros de role */}
      <div className="flex gap-1.5 flex-wrap">
        {filtros.map(f => {
          const isActive = (filtroRole ?? null) === f.role
          return (
            <Link
              key={f.label}
              href={f.role ? `/admin/usuarios?role=${f.role}` : '/admin/usuarios'}
              className="px-3 py-1.5 text-sm rounded-xl transition-all duration-200"
              style={{
                background: isActive ? 'var(--color-rose-main)' : 'var(--color-border-soft)',
                color: isActive ? '#fff' : 'var(--color-ink-mid)',
                fontWeight: isActive ? '500' : '400',
              }}
            >
              {f.label}
            </Link>
          )
        })}
      </div>

      <Card>
        {usuarios && usuarios.length > 0 ? (
          <ul className="divide-y" style={{ borderColor: 'var(--color-border-soft)' }}>
            {usuarios.map((u) => (
              <li key={u.id} className="py-3 flex items-center justify-between first:pt-0 last:pb-0">
                <Link
                  href={`/admin/usuarios/${u.id}`}
                  className="font-medium transition-colors hover:opacity-80"
                  style={{ color: 'var(--color-ink)' }}
                >
                  {u.nome}
                </Link>
                <Badge color={roleColor[u.role] ?? 'gray'}>
                  {roleLabel[u.role] ?? u.role}
                </Badge>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm" style={{ color: 'var(--color-ink-faint)' }}>
            Nenhum usuário encontrado.
          </p>
        )}
      </Card>
    </div>
  )
}
