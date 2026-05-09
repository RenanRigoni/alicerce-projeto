import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { ComunicadoCard } from '@/components/ui/ComunicadoCard'

export default async function AdminDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: meProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user!.id)
    .single()

  const isRecepcao = meProfile?.role === 'recepcao'

  const [
    { count: totalPacientes },
    { data: familiasDados },
    { count: totalTerapeutas },
    { data: altasPendentes },
    { data: altasRecentes },
    { data: relatóriosRecentes },
    { data: feriados },
    { data: comunicados },
  ] = await Promise.all([
    supabase.from('pacientes').select('*', { count: 'exact', head: true }).eq('status', 'ativo'),
    supabase
      .from('paciente_responsaveis')
      .select('responsavel_id, pacientes!inner(status)')
      .eq('pacientes.status', 'ativo'),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'terapeuta').eq('ativo', true),
    supabase
      .from('solicitacoes_alta')
      .select('id, criado_em, motivo, pacientes(nome), profiles!solicitacoes_alta_solicitado_por_fkey(nome)')
      .eq('status', 'pendente')
      .order('criado_em', { ascending: true }),
    supabase
      .from('solicitacoes_alta')
      .select('criado_em, pacientes(id, nome), profiles!solicitacoes_alta_solicitado_por_fkey(nome)')
      .in('status', ['confirmada', 'registrada', 'aprovada'])
      .order('criado_em', { ascending: false })
      .limit(5),
    !isRecepcao
      ? supabase
          .from('relatorios')
          .select('id, paciente_id, identificacao, status, conclusao, criado_em, pacientes!inner(nome)')
          .not('paciente_id', 'is', null)
          .order('criado_em', { ascending: false })
          .limit(5)
      : Promise.resolve({ data: [] }),
    supabase
      .from('feriados')
      .select('data, descricao, anual')
      .order('data'),
    supabase
      .from('comunicados')
      .select('id, titulo, conteudo, criado_em, profiles(nome)')
      .order('criado_em', { ascending: false })
      .limit(3),
  ])

  const totalFamilias = new Set((familiasDados ?? []).map((f: any) => f.responsavel_id)).size

  // Feriados do mês atual — expande anuais para o ano corrente
  const hoje = new Date()
  const anoAtual = hoje.getFullYear()
  const mesAtualStr = String(hoje.getMonth() + 1).padStart(2, '0')

  const feriadosDoMes = (feriados ?? [])
    .flatMap((f: any) => {
      const [, fMes, fDia] = (f.data as string).split('-')
      if (fMes !== mesAtualStr) return []
      const dataAnoAtual = `${anoAtual}-${fMes}-${fDia}`
      const dt = new Date(`${dataAnoAtual}T12:00:00`)
      if (String(dt.getMonth() + 1).padStart(2, '0') !== fMes) return [] // bissexto edge case
      return [{ data: dataAnoAtual, descricao: f.descricao as string }]
    })
    .sort((a, b) => a.data.localeCompare(b.data))

  return (
    <div className="space-y-6">
      <div>
        <h1
          className="text-2xl font-semibold"
          style={{ fontFamily: 'var(--font-lora)', color: 'var(--color-ink)' }}
        >
          Visão geral
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--color-ink-soft)' }}>
          {isRecepcao ? 'Painel da recepção' : 'Painel administrativo'}
        </p>
      </div>

      {/* Banner de altas pendentes */}
      {altasPendentes && altasPendentes.length > 0 && (
        <div
          className="rounded-2xl px-5 py-4"
          style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}
        >
          <div className="flex items-center gap-2.5 mb-3">
            <span
              className="w-5 h-5 rounded-full text-white text-xs font-bold flex items-center justify-center flex-shrink-0"
              style={{ background: '#F59E0B' }}
            >
              {altasPendentes.length}
            </span>
            <span className="text-sm font-semibold" style={{ color: '#92400E' }}>
              {altasPendentes.length === 1 ? 'Solicitação de alta pendente' : 'Solicitações de alta pendentes'}
            </span>
          </div>
          <ul className="space-y-2">
            {altasPendentes.map((a: any) => (
              <li key={a.id} className="flex items-center justify-between gap-3">
                <div className="text-sm" style={{ color: '#78350F' }}>
                  <span className="font-medium">{a.pacientes?.nome}</span>
                  <span style={{ color: '#B45309' }}> · por {a.profiles?.nome}</span>
                </div>
                <Link
                  href="/admin/alta"
                  className="text-xs font-medium rounded-lg px-3 py-1 transition-colors flex-shrink-0"
                  style={{ color: '#92400E', border: '1px solid #FCD34D', background: 'transparent' }}
                >
                  Analisar
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Cards de totais */}
      <div className="grid grid-cols-3 gap-4">
        <Link href="/admin/pacientes">
          <Card className="hover:shadow-md transition-all duration-200 cursor-pointer group">
            <div
              className="text-3xl font-bold mb-1 group-hover:scale-105 transition-transform duration-200 inline-block"
              style={{ color: 'var(--color-rose-main)', fontFamily: 'var(--font-lora)' }}
            >
              {totalPacientes ?? 0}
            </div>
            <div className="text-sm" style={{ color: 'var(--color-ink-soft)' }}>Pacientes ativos</div>
          </Card>
        </Link>
        <Link href="/admin/responsaveis">
          <Card className="hover:shadow-md transition-all duration-200 cursor-pointer group">
            <div
              className="text-3xl font-bold mb-1 group-hover:scale-105 transition-transform duration-200 inline-block"
              style={{ color: 'var(--color-peach-main)', fontFamily: 'var(--font-lora)' }}
            >
              {totalFamilias}
            </div>
            <div className="text-sm" style={{ color: 'var(--color-ink-soft)' }}>Famílias ativas</div>
          </Card>
        </Link>
        <Link href="/admin/terapeutas">
          <Card className="hover:shadow-md transition-all duration-200 cursor-pointer group">
            <div
              className="text-3xl font-bold mb-1 group-hover:scale-105 transition-transform duration-200 inline-block"
              style={{ color: 'var(--color-sage-main)', fontFamily: 'var(--font-lora)' }}
            >
              {totalTerapeutas ?? 0}
            </div>
            <div className="text-sm" style={{ color: 'var(--color-ink-soft)' }}>Terapeutas</div>
          </Card>
        </Link>
      </div>

      {/* Altas recentes */}
      {altasRecentes && altasRecentes.length > 0 && (
        <div>
          <h2
            className="text-xs font-semibold uppercase tracking-wider mb-3"
            style={{ color: 'var(--color-ink-soft)' }}
          >
            Altas recentes
          </h2>
          <Card>
            <ul className="space-y-2">
              {altasRecentes.map((a: any, i: number) => (
                <li key={i} className="flex items-center justify-between gap-3">
                  <div className="text-sm min-w-0">
                    <span className="font-medium" style={{ color: 'var(--color-ink)' }}>
                      {(a.pacientes as any)?.nome ?? '—'}
                    </span>
                    {(a.profiles as any)?.nome && (
                      <span style={{ color: 'var(--color-ink-soft)' }}> · {(a.profiles as any).nome}</span>
                    )}
                  </div>
                  <span className="text-xs flex-shrink-0" style={{ color: 'var(--color-ink-faint)' }}>
                    {new Date(a.criado_em).toLocaleDateString('pt-BR')}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}

      {/* Relatórios recentes */}
      {!isRecepcao && (
        <div>
          <h2
            className="text-xs font-semibold uppercase tracking-wider mb-3"
            style={{ color: 'var(--color-ink-soft)' }}
          >
            Relatórios recentes
          </h2>
          <Card>
            {relatóriosRecentes && relatóriosRecentes.length > 0 ? (
              <ul className="space-y-1">
                {relatóriosRecentes.map((r: any) => (
                  <li key={r.id}>
                    <Link
                      href={`/admin/pacientes/${r.paciente_id}`}
                      className="flex items-start justify-between gap-3 rounded-xl px-3 py-2.5 -mx-3 transition-colors hover:bg-[var(--color-rose-blush)]"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium" style={{ color: 'var(--color-ink)' }}>
                          {r.pacientes?.nome ?? '—'}
                          {r.identificacao && (
                            <span style={{ color: 'var(--color-ink-soft)', fontWeight: 400 }}>
                              {' — '}{r.identificacao}
                            </span>
                          )}
                        </div>
                        {r.conclusao && (
                          <div
                            className="text-xs mt-0.5 line-clamp-1"
                            style={{ color: 'var(--color-ink-soft)' }}
                          >
                            {r.conclusao}
                          </div>
                        )}
                        <div className="text-xs mt-0.5" style={{ color: 'var(--color-ink-faint)' }}>
                          {new Date(r.criado_em).toLocaleDateString('pt-BR')}
                        </div>
                      </div>
                      <span
                        className="px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 mt-0.5"
                        style={r.status === 'publicado'
                          ? { background: 'var(--color-sage-light)', color: 'var(--color-sage-deep)' }
                          : { background: '#FFFBEB', color: '#92400E' }
                        }
                      >
                        {r.status}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm" style={{ color: 'var(--color-ink-faint)' }}>Nenhum relatório ainda.</p>
            )}
          </Card>
        </div>
      )}

      {/* Feriados do mês atual */}
      {feriadosDoMes.length > 0 && (
        <div>
          <h2
            className="text-xs font-semibold uppercase tracking-wider mb-3"
            style={{ color: 'var(--color-ink-soft)' }}
          >
            Feriados deste mês
          </h2>
          <Card>
            <div className="space-y-2.5">
              {feriadosDoMes.map((f) => (
                <div key={f.data} className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: 'var(--color-rose-soft)' }} />
                  <div>
                    <span className="text-sm font-medium" style={{ color: 'var(--color-ink)' }}>{f.descricao}</span>
                    <span className="text-xs ml-2" style={{ color: 'var(--color-ink-soft)' }}>
                      {new Date(f.data + 'T12:00:00').toLocaleDateString('pt-BR', {
                        weekday: 'long', day: '2-digit', month: 'long',
                      })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Comunicados recentes */}
      {comunicados && comunicados.length > 0 && (
        <div>
          <h2
            className="text-xs font-semibold uppercase tracking-wider mb-3"
            style={{ color: 'var(--color-ink-soft)' }}
          >
            Comunicados recentes
          </h2>
          <div className="space-y-3">
            {comunicados.map((c: any) => (
              <ComunicadoCard
                key={c.id}
                titulo={c.titulo}
                conteudo={c.conteudo}
                autor={c.profiles?.nome}
                criado_em={c.criado_em}
              />
            ))}
          </div>
        </div>
      )}

      {/* Ações rápidas */}
      <div>
        <h2
          className="text-xs font-semibold uppercase tracking-wider mb-3"
          style={{ color: 'var(--color-ink-soft)' }}
        >
          Ações rápidas
        </h2>
        <Card>
          <div className="flex flex-wrap gap-2.5">
            <Link
              href="/admin/pacientes/novo"
              className="text-sm font-medium px-4 py-2 rounded-xl text-white transition-all duration-200 active:scale-[0.98]"
              style={{ background: 'var(--color-rose-main)' }}
            >
              + Novo paciente
            </Link>
            <Link
              href="/admin/usuarios/novo"
              className="text-sm font-medium px-4 py-2 rounded-xl transition-all duration-200 active:scale-[0.98]"
              style={{ background: 'var(--color-rose-blush)', color: 'var(--color-rose-deep)' }}
            >
              + Novo usuário
            </Link>
            <Link
              href="/admin/agendamentos/novo"
              className="text-sm font-medium px-4 py-2 rounded-xl transition-all duration-200 active:scale-[0.98]"
              style={{ background: 'var(--color-rose-blush)', color: 'var(--color-rose-deep)' }}
            >
              + Agendamento
            </Link>
            <Link
              href="/admin/comunicados"
              className="text-sm font-medium px-4 py-2 rounded-xl transition-all duration-200 active:scale-[0.98]"
              style={{ background: 'var(--color-border-soft)', color: 'var(--color-ink-mid)' }}
            >
              Comunicados
            </Link>
            <Link
              href="/admin/feriados"
              className="text-sm font-medium px-4 py-2 rounded-xl transition-all duration-200 active:scale-[0.98]"
              style={{ background: 'var(--color-border-soft)', color: 'var(--color-ink-mid)' }}
            >
              Feriados
            </Link>
          </div>
        </Card>
      </div>
    </div>
  )
}
