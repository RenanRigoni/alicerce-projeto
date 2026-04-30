'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { POLICY_VERSION } from '@/lib/consentimento'

export function ConsentimentoModal() {
  const router = useRouter()
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')

  async function handleAceitar() {
    setCarregando(true)
    setErro('')
    const res = await fetch('/api/consentimento', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ policy_versao: POLICY_VERSION }),
    })
    if (!res.ok) {
      setErro('Erro ao registrar aceite. Tente novamente.')
      setCarregando(false)
      return
    }
    router.refresh()
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: 'rgba(44,32,24,0.55)', backdropFilter: 'blur(4px)' }}
    >
      <div
        className="w-full max-w-lg rounded-3xl flex flex-col"
        style={{
          background: 'var(--color-warm-white)',
          border: '1px solid var(--color-border)',
          boxShadow: '0 32px 64px rgba(44,32,24,0.18)',
          maxHeight: '90vh',
        }}
      >
        {/* Cabeçalho */}
        <div
          className="px-7 pt-7 pb-5 shrink-0"
          style={{ borderBottom: '1px solid var(--color-border-soft)' }}
        >
          <div className="flex items-start gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'var(--color-peach-light)' }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--color-peach-main)' }}>
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold leading-tight" style={{ fontFamily: 'var(--font-lora)', color: 'var(--color-ink)' }}>
                Termos de uso e privacidade
              </h2>
              <p className="text-sm mt-0.5" style={{ color: 'var(--color-ink-soft)' }}>
                Leia e aceite antes de acessar o portal
              </p>
            </div>
          </div>
        </div>

        {/* Conteúdo com scroll */}
        <div className="flex-1 overflow-y-auto px-7 py-5 space-y-4 text-sm" style={{ color: 'var(--color-ink-mid)', lineHeight: '1.65' }}>
          <p>
            Bem-vindo ao portal da <strong style={{ color: 'var(--color-ink)' }}>Alicerce Espaço Terapêutico Infantil</strong>.
            Para acessar as informações sobre o(a) seu(sua) filho(a), precisamos que você leia e concorde com os termos abaixo.
          </p>

          <div>
            <p className="font-semibold mb-1" style={{ color: 'var(--color-ink)' }}>Quais dados coletamos</p>
            <p>
              Coletamos seus dados de identificação (nome, e-mail, CPF) e os dados de saúde do paciente
              (diagnóstico, relatórios terapêuticos, registros de atendimento) exclusivamente para a
              prestação dos serviços contratados.
            </p>
          </div>

          <div>
            <p className="font-semibold mb-1" style={{ color: 'var(--color-ink)' }}>Como usamos os dados</p>
            <p>
              Os dados são usados para: (i) registro e manutenção do prontuário eletrônico; (ii) comunicação
              com o responsável legal; (iii) cumprimento das obrigações legais perante o COFFITO. Os dados de
              saúde têm como base legal a <em>tutela da saúde</em> (Art. 11, II, &ldquo;f&rdquo; da LGPD).
            </p>
          </div>

          <div>
            <p className="font-semibold mb-1" style={{ color: 'var(--color-ink)' }}>Quanto tempo guardamos</p>
            <p>
              O prontuário clínico é de guarda obrigatória por no mínimo 20 anos a partir do último
              atendimento, ou até o(a) paciente completar 28 anos — conforme Resolução COFFITO vigente.
              Não é possível solicitar a exclusão desses registros nesse período.
            </p>
          </div>

          <div>
            <p className="font-semibold mb-1" style={{ color: 'var(--color-ink)' }}>Seus direitos (LGPD, Art. 18)</p>
            <p>
              Você pode solicitar acesso, correção ou portabilidade dos seus dados pessoais a qualquer momento
              pelo canal de atendimento da clínica. Dados de saúde do paciente são protegidos por sigilo
              profissional e não serão compartilhados com terceiros sem seu consentimento, salvo por
              determinação judicial.
            </p>
          </div>

          <div>
            <p className="font-semibold mb-1" style={{ color: 'var(--color-ink)' }}>Câmeras de segurança</p>
            <p>
              O espaço clínico dispõe de câmeras de segurança. As imagens não são utilizadas para fins
              comerciais ou divulgação, conforme previsto no contrato de prestação de serviços.
            </p>
          </div>

          <p>
            Para ler a política completa,{' '}
            <a
              href="/privacidade"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'var(--color-peach-main)', textDecoration: 'underline' }}
            >
              acesse nossa Política de Privacidade
            </a>.
          </p>
        </div>

        {/* Rodapé */}
        <div
          className="px-7 pb-7 pt-5 shrink-0 space-y-3"
          style={{ borderTop: '1px solid var(--color-border-soft)' }}
        >
          {erro && (
            <p className="text-sm text-center" style={{ color: '#B91C1C' }}>{erro}</p>
          )}
          <button
            onClick={handleAceitar}
            disabled={carregando}
            className="w-full py-3.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-60"
            style={{
              background: 'linear-gradient(135deg, rgba(232,160,122,0.95) 0%, rgba(200,120,80,0.98) 100%)',
              boxShadow: '0 4px 16px rgba(232,160,122,0.35)',
            }}
          >
            {carregando ? 'Registrando...' : 'Li e concordo com os termos'}
          </button>
          <p className="text-xs text-center" style={{ color: 'var(--color-ink-faint)' }}>
            Ao aceitar, registramos sua concordância com data e hora para fins de conformidade com a LGPD.
          </p>
        </div>
      </div>
    </div>
  )
}
