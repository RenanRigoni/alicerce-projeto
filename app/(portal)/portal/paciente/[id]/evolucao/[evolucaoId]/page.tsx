import { createClient } from '@/lib/supabase/server'
import { Card } from '@/components/ui/Card'
import { notFound } from 'next/navigation'
import { registrarAcao } from '@/lib/audit/registrar-acao'

export default async function EvolucaoPortalPage({
  params,
}: {
  params: Promise<{ id: string; evolucaoId: string }>
}) {
  const { id, evolucaoId } = await params

  const supabase = await createClient()

  const { data: evolucao } = await supabase
    .from('evolucoes')
    .select(`
      *,
      pacientes(nome),
      profiles(nome)
    `)
    .eq('id', evolucaoId)
    .eq('paciente_id', id)
    .eq('status', 'publicado')
    .single()

  if (!evolucao) notFound()

  await registrarAcao('visualizou', 'evolucao', evolucaoId)

  const dataPublicacao = evolucao.publicado_em
    ? new Date(evolucao.publicado_em).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
    : ''

  const secoes = [
    { titulo: '1. Identificação',         conteudo: evolucao.identificacao },
    { titulo: '2. Observações clínicas',  conteudo: evolucao.obs_clinicas },
    { titulo: '3. Testes aplicados',      conteudo: evolucao.testes },
    { titulo: '4. Resultado e discussão', conteudo: evolucao.resultado_discussao },
    { titulo: '5. Conclusão',             conteudo: evolucao.conclusao },
  ]

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <a
          href={`/portal/paciente/${id}?aba=evolucoes`}
          className="text-sm transition-colors hover:opacity-70"
          style={{ color: 'var(--color-ink-soft)' }}
        >
          Voltar
        </a>
        <h1
          className="text-2xl font-semibold"
          style={{ fontFamily: 'var(--font-lora)', color: 'var(--color-ink)' }}
        >
          Evolução clínica
        </h1>
      </div>

      <Card>
        <div className="space-y-1">
          <div className="text-lg font-semibold" style={{ fontFamily: 'var(--font-lora)', color: 'var(--color-ink)' }}>
            {(evolucao.pacientes as any)?.nome}
          </div>
          {evolucao.identificacao && (
            <p className="text-sm" style={{ color: 'var(--color-ink-soft)' }}>{evolucao.identificacao}</p>
          )}
          <div
            className="flex items-center gap-3 text-xs mt-2 pt-2"
            style={{ borderTop: '1px solid var(--color-border-soft)', color: 'var(--color-ink-faint)' }}
          >
            <span>Profissional: {(evolucao.profiles as any)?.nome}</span>
            {dataPublicacao && <span>· {dataPublicacao}</span>}
          </div>
        </div>
      </Card>

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

      {evolucao.assinatura_digital && (
        <Card>
          <div
            className="text-xs font-bold uppercase tracking-wide mb-2"
            style={{ color: 'var(--color-lavender-main)' }}
          >
            Assinatura digital
          </div>
          <p className="text-xs font-mono break-all" style={{ color: 'var(--color-ink-soft)' }}>
            {evolucao.assinatura_digital}
          </p>
        </Card>
      )}

      {evolucao.pdf_url && (
        <div className="flex justify-end">
          <a
            href={evolucao.pdf_url.startsWith('http') ? evolucao.pdf_url : `/api/evolucao/${evolucaoId}/pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium px-5 py-2.5 rounded-xl text-white transition-opacity hover:opacity-90"
            style={{ background: 'var(--color-rose-main)' }}
          >
            Baixar PDF
          </a>
        </div>
      )}
    </div>
  )
}
