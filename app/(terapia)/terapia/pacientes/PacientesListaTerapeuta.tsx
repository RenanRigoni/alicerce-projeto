'use client'

import { useMemo, useState, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import {
  filtrarPacientes,
  lerModoSalvo,
  salvarModo,
  type ModoLista,
  type PacienteDaLista,
  type StatusPaciente,
} from '@/lib/pacientes/filtrar-lista'

const statusLabel: Record<StatusPaciente, string> = { ativo: 'Ativo', alta: 'Alta', desativado: 'Inativo' }
const statusColor: Record<StatusPaciente, 'green' | 'blue' | 'rose'> = { ativo: 'green', alta: 'blue', desativado: 'rose' }

const CHAVE_MODO = 'terapia:pacientes:modo'

// O storage só muda por ação desta própria tela, então não há o que assinar.
function assinarNada() {
  return () => {}
}

export function PacientesListaTerapeuta({
  pacientes,
  meusIds,
  podeCadastrarPacientes,
  podeVerTodosPacientes,
}: {
  pacientes: PacienteDaLista[]
  meusIds: string[]
  podeCadastrarPacientes: boolean
  podeVerTodosPacientes: boolean
}) {
  const [filtros, setFiltros] = useState<Set<StatusPaciente>>(new Set(['ativo']))
  const [busca, setBusca] = useState('')
  // Abre em "Meus pacientes". Uma escolha anterior desta sessão vem do storage
  // via useSyncExternalStore: no servidor o snapshot é null, então não há
  // descompasso na hidratação, e o acesso que lança vira null em lerModoSalvo.
  const [modoEscolhido, setModoEscolhido] = useState<ModoLista | null>(null)
  const modoSalvo = useSyncExternalStore(assinarNada, () => lerModoSalvo(CHAVE_MODO), () => null)

  // Sem a permissão não há alternador nem "Todos": a lista já vem só com os dela.
  const modo: ModoLista = podeVerTodosPacientes ? (modoEscolhido ?? modoSalvo ?? 'meus') : 'meus'
  const meusIdsSet = useMemo(() => new Set(meusIds), [meusIds])

  function escolherModo(novo: ModoLista) {
    setModoEscolhido(novo)
    salvarModo(CHAVE_MODO, novo)
  }

  function toggleFiltro(status: StatusPaciente) {
    setFiltros(prev => {
      const next = new Set(prev)
      if (next.has(status)) { next.delete(status) } else { next.add(status) }
      if (next.size === 0) return new Set(['ativo'])
      return next
    })
  }

  const lista = filtrarPacientes({ pacientes, meusIds: meusIdsSet, modo, status: filtros, busca })

  // Lista de origem vazia (nenhum vínculo) é diferente de "o filtro não achou":
  // no primeiro caso mexer em filtro não resolve, é preciso falar com a recepção.
  const semNenhumPaciente = modo === 'meus' ? meusIds.length === 0 : pacientes.length === 0
  const textoListaVazia = semNenhumPaciente
    ? (podeVerTodosPacientes
      ? 'Você ainda não tem pacientes vinculados. Use "Todos" para ver a clínica inteira ou fale com a recepção.'
      : 'Você ainda não tem pacientes vinculados. Fale com a recepção.')
    : (modo === 'meus' && podeVerTodosPacientes
      ? 'Nenhum paciente seu para os filtros selecionados. Use "Todos" para ver a clínica inteira.'
      : 'Nenhum paciente encontrado para os filtros selecionados.')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold" style={{ fontFamily: 'var(--font-lora)', color: 'var(--color-ink)' }}>
            {modo === 'meus' ? 'Meus pacientes' : 'Pacientes'}
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-ink-soft)' }}>
            {lista.length} paciente{lista.length !== 1 ? 's' : ''} encontrado{lista.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {podeVerTodosPacientes && (
            <div
              role="group"
              aria-label="Quais pacientes mostrar"
              className="flex items-center rounded-full border p-0.5"
              style={{ borderColor: 'var(--color-border)' }}
            >
              {(['meus', 'todos'] as ModoLista[]).map(m => (
                <button
                  key={m}
                  type="button"
                  aria-pressed={modo === m}
                  onClick={() => escolherModo(m)}
                  className="text-xs font-medium px-3 py-1.5 rounded-full transition-all duration-150"
                  style={modo === m
                    ? { background: 'var(--color-sage-light)', color: 'var(--color-sage-deep)' }
                    : { background: 'transparent', color: 'var(--color-ink-soft)' }}
                >
                  {m === 'meus' ? 'Meus pacientes' : 'Todos'}
                </button>
              ))}
            </div>
          )}
          <input
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Nome ou #código..."
            aria-label="Filtrar pacientes por nome ou código"
            className="input-base text-sm"
            style={{ width: 200 }}
          />
          <div className="flex items-center gap-2">
            {(['ativo', 'desativado', 'alta'] as StatusPaciente[]).map(s => (
              <button
                key={s}
                onClick={() => toggleFiltro(s)}
                className="text-xs font-medium px-3 py-1.5 rounded-full border transition-all duration-150"
                style={filtros.has(s) ? {
                  background: s === 'ativo' ? 'var(--color-sage-light)' : s === 'alta' ? '#EFF6FF' : 'var(--color-rose-blush)',
                  color: s === 'ativo' ? 'var(--color-sage-deep)' : s === 'alta' ? '#1D4ED8' : 'var(--color-rose-deep)',
                  borderColor: s === 'ativo' ? 'var(--color-sage-soft)' : s === 'alta' ? '#BFDBFE' : 'var(--color-rose-muted)',
                } : {
                  background: 'transparent', color: 'var(--color-ink-soft)', borderColor: 'var(--color-border)',
                }}
              >
                {statusLabel[s]}
              </button>
            ))}
          </div>
          {podeCadastrarPacientes && (
            <Link
              href="/terapia/pacientes/novo"
              className="text-sm font-medium px-4 py-2 rounded-xl text-white transition-all duration-200 active:scale-[0.98]"
              style={{ background: 'var(--color-sage-main)' }}
            >
              + Cadastrar paciente
            </Link>
          )}
        </div>
      </div>

      <Card>
        {lista.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--color-ink-faint)' }}>{textoListaVazia}</p>
        ) : (
          <ul className="divide-y" style={{ borderColor: 'var(--color-border-soft)' }}>
            {lista.map(p => (
              <li key={p.id} className="py-3 flex items-center justify-between gap-3 first:pt-0 last:pb-0">
                <div className="flex items-center gap-3 min-w-0">
                  {p.codigo_interno && (
                    <span className="text-xs font-mono flex-shrink-0" style={{ color: 'var(--color-ink-faint)' }}>
                      #{p.codigo_interno}
                    </span>
                  )}
                  <div className="min-w-0">
                    <div className="font-medium truncate" style={{ color: 'var(--color-ink)' }}>{p.nome}</div>
                    {p.frequencia_atendimento && (
                      <div className="text-xs" style={{ color: 'var(--color-ink-soft)' }}>{p.frequencia_atendimento}</div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <Badge color={statusColor[p.status] ?? 'gray'}>{statusLabel[p.status] ?? p.status}</Badge>
                  <a href={`/terapia/paciente/${p.id}`} className="text-sm font-medium transition-colors hover:opacity-80" style={{ color: 'var(--color-sage-main)' }}>
                    Ver
                  </a>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
