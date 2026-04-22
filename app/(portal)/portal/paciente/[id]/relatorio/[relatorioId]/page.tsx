import { createClient } from '@/lib/supabase/server'
import { Card } from '@/components/ui/Card'
import { notFound } from 'next/navigation'
import { registrarAcao } from '@/lib/audit/registrar-acao'

export default async function RelatorioPortalPage({
  params,
}: {
  params: Promise<{ id: string; relatorioId: string }>
}) {
  const { id, relatorioId } = await params

  const supabase = await createClient()

  const { data: relatorio } = await supabase
    .from('relatorios')
    .select(`
      *,
      pacientes(nome),
      profiles(nome)
    `)
    .eq('id', relatorioId)
    .eq('paciente_id', id)
    .eq('status', 'publicado')
    .single()

  if (!relatorio) notFound()

  await registrarAcao('visualizou', 'relatorio', relatorioId)

  const dataPublicacao = relatorio.publicado_em
    ? new Date(relatorio.publicado_em).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
    : ''

  const secoes = [
    { titulo: '1. Identificação',         conteudo: relatorio.identificacao },
    { titulo: '2. Observações Clínicas',  conteudo: relatorio.obs_clinicas },
    { titulo: '3. Testes Aplicados',       conteudo: relatorio.testes },
    { titulo: '4. Resultado e Discussão', conteudo: relatorio.resultado_discussao },
    { titulo: '5. Conclusão',              conteudo: relatorio.conclusao },
  ]

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <a
          href={`/portal/paciente/${id}?aba=relatorios`}
          className="text-sm transition-colors hover:opacity-70"
          style={{ color: 'var(--color-ink-soft)' }}
        >
          ← Voltar
        </a>
        <h1
          className="text-2xl font-semibold"
          style={{ fontFamily: 'var(--font-lora)', color: 'var(--color-ink)' }}
        >
          Relatório de Avaliação
        </h1>
      </div>

      {/* Cabeçalho */}
      <Card>
        <div className="space-y-1">
          <div className="text-lg font-semibold" style={{ fontFamily: 'var(--font-lora)', color: 'var(--color-ink)' }}>
            {(relatorio.pacientes as any)?.nome}
          </div>
          {relatorio.identificacao && (
            <p className="text-sm" style={{ color: 'var(--color-ink-soft)' }}>{relatorio.identificacao}</p>
          )}
          <div
            className="flex items-center gap-3 text-xs mt-2 pt-2"
            style={{ borderTop: '1px solid var(--color-border-soft)', color: 'var(--color-ink-faint)' }}
          >
            <span>Terapeuta: {(relatorio.profiles as any)?.nome}</span>
            {dataPublicacao && <span>· {dataPublicacao}</span>}
          </div>
        </div>
      </Card>

      {/* Seções */}
      <div className="space-y-4">
        {secoes.filter(s => s.conteudo).map(secao => (
          <Card key={secao.titulo}>
            <div
              className="text-xs font-bold uppercase tracking-wide mb-2"
              style={{ color: 'var(--color-rose-main)' }}
            >
              {secao.titulo}
            </div>
            <p className="text-sm whitespace-pre-wrap leading-relaxed" style={{ color: 'var(--color-ink-mid)' }}>
              {secao.conteudo}
            </p>
          </Card>
        ))}
      </div>

      {/* Assinatura digital */}
      {relatorio.assinatura_digital && (
        <Card>
          <div
            className="text-xs font-bold uppercase tracking-wide mb-2"
            style={{ color: 'var(--color-lavender-main)' }}
          >
            Assinatura Digital
          </div>
          <p className="text-xs font-mono break-all" style={{ color: 'var(--color-ink-soft)' }}>
            {relatorio.assinatura_digital}
          </p>
        </Card>
      )}

      {/* Botão PDF */}
      <div className="flex justify-end">
        <a
          href={`/api/relatorio/${relatorioId}/pdf`}
          className="text-sm font-medium px-5 py-2.5 rounded-xl text-white transition-opacity hover:opacity-90"
          style={{ background: 'var(--color-rose-main)' }}
        >
          Baixar PDF
        </a>
      </div>
    </div>
  )
}
