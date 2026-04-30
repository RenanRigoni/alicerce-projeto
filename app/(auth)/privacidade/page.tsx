import Image from 'next/image'

export const metadata = {
  title: 'Política de Privacidade — Alicerce',
}

export default function PoliticaPrivacidade() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--color-cream)' }}>
      {/* Header */}
      <header
        className="sticky top-0 z-10"
        style={{
          background: 'var(--color-warm-white)',
          borderBottom: '1px solid var(--color-border)',
        }}
      >
        <div className="max-w-2xl mx-auto px-5 h-14 flex items-center justify-between">
          <a href="/login" style={{ textDecoration: 'none' }}>
            <Image
              src="/logo_hor.png"
              alt="Alicerce"
              width={80}
              height={32}
              priority
              style={{ objectFit: 'contain', width: 80, height: 32 }}
            />
          </a>
          <a
            href="/login"
            className="text-sm"
            style={{ color: 'var(--color-ink-soft)', textDecoration: 'none' }}
          >
            ← Voltar ao login
          </a>
        </div>
      </header>

      {/* Conteúdo */}
      <main className="max-w-2xl mx-auto px-5 py-12">
        <h1
          className="text-3xl font-semibold mb-2"
          style={{ fontFamily: 'var(--font-lora)', color: 'var(--color-ink)' }}
        >
          Política de Privacidade
        </h1>
        <p className="text-sm mb-10" style={{ color: 'var(--color-ink-soft)' }}>
          Alicerce Espaço Terapêutico Infantil · CNPJ 49.273.342/0001-74
          <br />
          Última atualização: abril de 2025
        </p>

        <div className="space-y-10 text-sm leading-relaxed" style={{ color: 'var(--color-ink-mid)' }}>

          <section>
            <h2 className="text-base font-semibold mb-3" style={{ color: 'var(--color-ink)' }}>
              1. Quem somos
            </h2>
            <p>
              A <strong style={{ color: 'var(--color-ink)' }}>Alicerce Terapia Ocupacional Ltda</strong>, com CNPJ n. 49.273.342/0001-74,
              endereço à Rua Nelson Caixeta de Queiroz n. 896, bairro Nossa Senhora de Fátima,
              Patrocínio/MG, é a controladora dos dados pessoais tratados por meio deste portal e
              dos serviços de terapia ocupacional prestados.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-3" style={{ color: 'var(--color-ink)' }}>
              2. Quais dados coletamos
            </h2>
            <ul className="list-disc list-inside space-y-1.5">
              <li><strong>Dados do responsável legal:</strong> nome, e-mail, CPF, endereço, telefone de contato.</li>
              <li><strong>Dados do paciente:</strong> nome, data de nascimento, diagnóstico, plano terapêutico, registros de atendimento, relatórios terapêuticos, fotos e vídeos de sessão (uso clínico interno).</li>
              <li><strong>Dados de acesso:</strong> registros de login, ações realizadas no portal (log de auditoria).</li>
              <li><strong>Imagens de câmeras de segurança:</strong> captadas no espaço físico da clínica.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-3" style={{ color: 'var(--color-ink)' }}>
              3. Por que coletamos e qual a base legal
            </h2>
            <div className="space-y-3">
              <div
                className="rounded-xl px-4 py-3"
                style={{ background: 'var(--color-peach-light)', border: '1px solid var(--color-border)' }}
              >
                <p className="font-medium mb-0.5" style={{ color: 'var(--color-ink)' }}>
                  Dados de saúde (prontuário clínico)
                </p>
                <p>
                  Base legal: <em>tutela da saúde</em> (Art. 11, II, &quot;f&quot;, LGPD). Usados para registro do
                  prontuário eletrônico oficial, planejamento terapêutico e comunicação com a equipe de saúde.
                </p>
              </div>
              <div
                className="rounded-xl px-4 py-3"
                style={{ background: 'var(--color-peach-light)', border: '1px solid var(--color-border)' }}
              >
                <p className="font-medium mb-0.5" style={{ color: 'var(--color-ink)' }}>
                  Dados do responsável legal
                </p>
                <p>
                  Base legal: <em>consentimento</em> (Art. 7, I, LGPD) prestado na assinatura do contrato
                  de prestação de serviços e na aceitação dos termos no portal. Usados para comunicação,
                  faturamento e acesso ao portal.
                </p>
              </div>
              <div
                className="rounded-xl px-4 py-3"
                style={{ background: 'var(--color-peach-light)', border: '1px solid var(--color-border)' }}
              >
                <p className="font-medium mb-0.5" style={{ color: 'var(--color-ink)' }}>
                  Obrigação legal
                </p>
                <p>
                  Base legal: <em>cumprimento de obrigação legal</em> (Art. 7, II, LGPD). A manutenção do
                  prontuário é obrigação regulatória imposta pelo COFFITO (Conselho Federal de Fisioterapia
                  e Terapia Ocupacional).
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-3" style={{ color: 'var(--color-ink)' }}>
              4. Por quanto tempo guardamos os dados
            </h2>
            <p>
              O prontuário clínico (relatórios, registros de atendimento, dados de saúde) é mantido pelo
              prazo mínimo de <strong style={{ color: 'var(--color-ink)' }}>20 anos</strong> contados do
              último atendimento, ou até que o(a) paciente complete{' '}
              <strong style={{ color: 'var(--color-ink)' }}>28 anos de idade</strong> — o que for maior —
              conforme Resolução COFFITO vigente.
            </p>
            <p className="mt-2">
              Os dados de identificação do responsável são mantidos pelo mesmo prazo enquanto houver
              vínculo ativo. Após o prazo legal, os dados são descartados de forma segura e definitiva.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-3" style={{ color: 'var(--color-ink)' }}>
              5. Com quem compartilhamos
            </h2>
            <p>
              Os dados não são comercializados ou cedidos a terceiros. O compartilhamento ocorre apenas:
            </p>
            <ul className="list-disc list-inside space-y-1.5 mt-2">
              <li>Com profissionais da equipe terapêutica diretamente envolvidos no atendimento do paciente;</li>
              <li>Com operadoras de plano de saúde, exclusivamente para fins de autorização e faturamento;</li>
              <li>Com autoridades públicas, quando exigido por determinação judicial ou legal.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-3" style={{ color: 'var(--color-ink)' }}>
              6. Como protegemos os dados
            </h2>
            <ul className="list-disc list-inside space-y-1.5">
              <li>Armazenamento em nuvem com criptografia em repouso (AES-256) e em trânsito (TLS);</li>
              <li>Acesso controlado por credenciais individuais intransferíveis e políticas de permissão por perfil;</li>
              <li>Registro de auditoria de todas as ações realizadas no sistema;</li>
              <li>Acesso do responsável restrito aos dados do(s) próprio(s) paciente(s) vinculado(s).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-3" style={{ color: 'var(--color-ink)' }}>
              7. Seus direitos como titular (LGPD, Art. 18)
            </h2>
            <p>Você tem direito a:</p>
            <ul className="list-disc list-inside space-y-1.5 mt-2">
              <li>Confirmação da existência do tratamento e acesso aos seus dados;</li>
              <li>Correção de dados incompletos, inexatos ou desatualizados;</li>
              <li>Portabilidade dos dados a outro fornecedor, mediante solicitação;</li>
              <li>Informação sobre compartilhamento realizado;</li>
              <li>Revogação do consentimento para dados que não sejam de guarda obrigatória.</li>
            </ul>
            <p className="mt-3">
              <strong style={{ color: 'var(--color-ink)' }}>Atenção:</strong> dados clínicos do prontuário
              não podem ser excluídos enquanto estiver dentro do prazo de guarda obrigatória definido pelo
              COFFITO, conforme Art. 16, I, da LGPD.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-3" style={{ color: 'var(--color-ink)' }}>
              8. Encarregado de dados (DPO)
            </h2>
            <p>
              A encarregada pelo tratamento de dados é{' '}
              <strong style={{ color: 'var(--color-ink)' }}>Isabella Alvarenga de Oliveira</strong>.
              Para exercer seus direitos ou esclarecer dúvidas sobre esta política, entre em contato:
            </p>
            <div
              className="mt-3 rounded-xl px-4 py-3"
              style={{ background: 'var(--color-sand)', border: '1px solid var(--color-border)' }}
            >
              <p>
                WhatsApp: <strong style={{ color: 'var(--color-ink)' }}>(34) 9 9290-0583</strong>
                <br />
                Horário: segunda a sexta, das 07h às 11h e das 14h às 18h
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-3" style={{ color: 'var(--color-ink)' }}>
              9. Câmeras de segurança
            </h2>
            <p>
              O espaço clínico dispõe de câmeras de segurança. As imagens não são usadas para fins
              comerciais, publicidade, redes sociais ou qualquer divulgação pública, salvo por determinação
              judicial, conforme previsto no contrato de prestação de serviços.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-3" style={{ color: 'var(--color-ink)' }}>
              10. Alterações nesta política
            </h2>
            <p>
              Esta política pode ser atualizada periodicamente. Alterações relevantes serão comunicadas
              ao responsável pelo portal mediante notificação no sistema.
            </p>
          </section>

        </div>

        {/* Rodapé */}
        <div
          className="mt-12 pt-6 text-xs text-center"
          style={{ borderTop: '1px solid var(--color-border)', color: 'var(--color-ink-faint)' }}
        >
          Alicerce Espaço Terapêutico Infantil · CNPJ 49.273.342/0001-74 · Patrocínio/MG
        </div>
      </main>
    </div>
  )
}
