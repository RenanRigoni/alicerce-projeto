import { createClient } from '@/lib/supabase/server'
import { Card } from '@/components/ui/Card'
import { redirect } from 'next/navigation'
import { ExportarDadosButton } from '@/components/portal/ExportarDadosButton'
import { EditarMeusDadosForm } from '@/components/portal/EditarMeusDadosForm'

export default async function MeusDadosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [
    { data: profile },
    { data: detalhes },
  ] = await Promise.all([
    supabase.from('profiles').select('nome, role').eq('id', user.id).single(),
    supabase.from('responsaveis_detalhes')
      .select('endereco, cidade, cep, telefone_principal, contato_emergencia')
      .eq('id', user.id)
      .maybeSingle(),
  ])

  if (!profile || profile.role !== 'pai') redirect('/login')

  const whatsappLink = 'https://wa.me/5534992900583?text=' +
    encodeURIComponent('Olá, gostaria de solicitar correção dos meus dados cadastrais no portal Alicerce.')

  const campo = (label: string, valor: string | null | undefined) =>
    valor ? { label, valor } : null

  const camposContato = [
    campo('Nome completo',    profile.nome),
    campo('E-mail',           user.email),
    campo('Telefone',         detalhes?.telefone_principal),
    campo('Contato emergência', detalhes?.contato_emergencia),
  ].filter(Boolean) as { label: string; valor: string }[]

  const camposEndereco = [
    campo('Endereço',  detalhes?.endereco),
    campo('Cidade',    detalhes?.cidade),
    campo('CEP',       detalhes?.cep),
  ].filter(Boolean) as { label: string; valor: string }[]

  return (
    <div className="space-y-6 max-w-lg">
      <div className="flex items-center gap-3">
        <a
          href="/portal/dashboard"
          className="text-sm transition-colors hover:opacity-70"
          style={{ color: 'var(--color-ink-soft)' }}
        >
          ← Voltar
        </a>
        <h1
          className="text-2xl font-semibold"
          style={{ fontFamily: 'var(--font-lora)', color: 'var(--color-ink)' }}
        >
          Meus dados
        </h1>
      </div>

      {/* Dados cadastrais */}
      <div className="space-y-3">
        <h2
          className="text-xs font-semibold uppercase tracking-wider"
          style={{ color: 'var(--color-ink-soft)' }}
        >
          Dados de contato
        </h2>
        <Card>
          <div className="space-y-3">
            {camposContato.length > 0 ? camposContato.map(c => (
              <div key={c.label}>
                <div className="text-xs uppercase tracking-wide mb-0.5" style={{ color: 'var(--color-ink-faint)' }}>
                  {c.label}
                </div>
                <div className="text-sm" style={{ color: 'var(--color-ink)' }}>{c.valor}</div>
              </div>
            )) : (
              <p className="text-sm" style={{ color: 'var(--color-ink-faint)' }}>
                Nenhum dado de contato cadastrado.
              </p>
            )}
          </div>
        </Card>
      </div>

      {/* Endereço */}
      {camposEndereco.length > 0 && (
        <div className="space-y-3">
          <h2
            className="text-xs font-semibold uppercase tracking-wider"
            style={{ color: 'var(--color-ink-soft)' }}
          >
            Endereço
          </h2>
          <Card>
            <div className="space-y-3">
              {camposEndereco.map(c => (
                <div key={c.label}>
                  <div className="text-xs uppercase tracking-wide mb-0.5" style={{ color: 'var(--color-ink-faint)' }}>
                    {c.label}
                  </div>
                  <div className="text-sm" style={{ color: 'var(--color-ink)' }}>{c.valor}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Edição self-service (LGPD Art. 18, III) */}
      <Card>
        <div className="space-y-3">
          <div>
            <h3 className="text-sm font-semibold" style={{ color: 'var(--color-ink)' }}>
              Dados incorretos?
            </h3>
            <p className="text-sm mt-1" style={{ color: 'var(--color-ink-soft)' }}>
              Corrija seus dados diretamente ou entre em contato com a clínica.
            </p>
          </div>
          <EditarMeusDadosForm
            nome={profile.nome ?? ''}
            telefone={detalhes?.telefone_principal ?? null}
            contato_emergencia={detalhes?.contato_emergencia ?? null}
            endereco={detalhes?.endereco ?? null}
            cidade={detalhes?.cidade ?? null}
            cep={detalhes?.cep ?? null}
          />
          <a
            href={whatsappLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm font-medium px-4 py-2.5 rounded-xl transition-all duration-200"
            style={{ background: '#DCFCE7', color: '#166534', textDecoration: 'none' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
              <path d="M12 0C5.373 0 0 5.373 0 12c0 2.136.559 4.14 1.535 5.875L0 24l6.322-1.505A11.942 11.942 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-5.017-1.376l-.36-.214-3.73.889.923-3.617-.235-.372A9.818 9.818 0 012.182 12c0-5.422 4.396-9.818 9.818-9.818 5.422 0 9.818 4.396 9.818 9.818 0 5.422-4.396 9.818-9.818 9.818z"/>
            </svg>
            Falar com a clínica via WhatsApp
          </a>
        </div>
      </Card>

      {/* Portabilidade de dados (LGPD Art. 18, VI) */}
      <Card>
        <div className="space-y-3">
          <div>
            <h3 className="text-sm font-semibold" style={{ color: 'var(--color-ink)' }}>
              Portabilidade de dados
            </h3>
            <p className="text-sm mt-1" style={{ color: 'var(--color-ink-soft)' }}>
              Baixe seus dados pessoais cadastrais em formato legível por máquina (LGPD Art. 18, VI).
              Dados clínicos do paciente não são incluídos — pertencem ao prontuário com retenção legal.
            </p>
          </div>
          <ExportarDadosButton />
        </div>
      </Card>

      {/* Retenção de prontuário */}
      <div
        className="rounded-xl px-4 py-3 text-sm space-y-1"
        style={{ background: 'var(--color-border-soft)', color: 'var(--color-ink-soft)' }}
      >
        <strong style={{ color: 'var(--color-ink-mid)' }}>Sobre exclusão de dados clínicos</strong>
        <p>
          O prontuário do paciente (relatórios, evoluções, documentos clínicos) não pode ser excluído.
          O COFFITO exige guarda mínima de <strong>20 anos</strong> após o encerramento do tratamento
          (Res. COFFITO 424/2013). Esta obrigação se sobrepõe ao pedido de exclusão previsto na
          LGPD Art. 18, V, por força do Art. 16, I da mesma lei.
        </p>
      </div>

      {/* DPO */}
      <p className="text-xs text-center" style={{ color: 'var(--color-ink-faint)' }}>
        Encarregada de dados (DPO): Isabella Alvarenga — {' '}
        <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className="underline">
          (34) 9 9290-0583
        </a>
      </p>
    </div>
  )
}
