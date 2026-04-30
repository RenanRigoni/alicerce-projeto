'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'

export default function RecuperarSenhaPage() {
  const [email, setEmail] = useState('')
  const [enviado, setEnviado] = useState(false)
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    setCarregando(true)

    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/atualizar-senha`,
    })

    if (error) {
      setErro('Não foi possível enviar o e-mail. Verifique o endereço.')
    } else {
      setEnviado(true)
    }
    setCarregando(false)
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-12"
      style={{ background: 'var(--color-cream)' }}
    >
      <div className="w-full max-w-sm animate-fade-up">

        {/* Logo */}
        <div className="flex flex-col items-center gap-3 mb-8">
          <Image src="/logo.png" alt="Alicerce" width={64} height={64} className="rounded-full" style={{ width: 64, height: 64 }} />
          <div className="text-center">
            <div
              className="text-xl font-semibold"
              style={{ fontFamily: 'var(--font-lora)', color: 'var(--color-ink)' }}
            >
              Alicerce
            </div>
            <div className="text-sm mt-0.5" style={{ color: 'var(--color-ink-soft)' }}>
              Recuperar senha
            </div>
          </div>
        </div>

        <div
          className="rounded-2xl p-8"
          style={{
            background: 'var(--color-warm-white)',
            border: '1px solid var(--color-border)',
            boxShadow: '0 4px 24px rgba(44,32,24,0.07)',
          }}
        >
          {enviado ? (
            <div className="text-center space-y-4">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center mx-auto"
                style={{ background: 'var(--color-sage-light)' }}
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: 'var(--color-sage-main)' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-sm" style={{ color: 'var(--color-ink-mid)' }}>
                Enviamos um link para <strong style={{ color: 'var(--color-ink)' }}>{email}</strong>.<br />
                Verifique sua caixa de entrada.
              </p>
              <a
                href="/login"
                className="text-sm font-medium block transition-opacity hover:opacity-70"
                style={{ color: 'var(--color-rose-main)' }}
              >
                Voltar para o login
              </a>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  className="block text-sm font-medium mb-1.5"
                  style={{ color: 'var(--color-ink-mid)' }}
                >
                  E-mail cadastrado
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  placeholder="seu@email.com"
                  className="w-full rounded-xl px-4 py-2.5 text-sm transition-all duration-200"
                  style={{
                    background: 'var(--color-cream)',
                    border: '1px solid var(--color-border)',
                    color: 'var(--color-ink)',
                    outline: 'none',
                  }}
                  onFocus={e => {
                    e.target.style.borderColor = 'var(--color-rose-soft)'
                    e.target.style.boxShadow = '0 0 0 3px var(--color-rose-blush)'
                  }}
                  onBlur={e => {
                    e.target.style.borderColor = 'var(--color-border)'
                    e.target.style.boxShadow = 'none'
                  }}
                />
              </div>

              {erro && (
                <p className="text-sm" style={{ color: '#B91C1C' }}>{erro}</p>
              )}

              <button
                type="submit"
                disabled={carregando}
                className="w-full py-2.5 rounded-xl text-sm font-medium text-white transition-all duration-200 disabled:opacity-60"
                style={{ background: 'var(--color-rose-main)' }}
              >
                {carregando ? 'Enviando...' : 'Enviar link de recuperação'}
              </button>

              <div className="text-center">
                <a
                  href="/login"
                  className="text-sm transition-opacity hover:opacity-70"
                  style={{ color: 'var(--color-rose-main)' }}
                >
                  Voltar para o login
                </a>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
