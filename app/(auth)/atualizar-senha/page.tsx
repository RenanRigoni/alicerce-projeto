'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'

export default function AtualizarSenhaPage() {
  const router = useRouter()
  const [senha, setSenha] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState(false)
  const [sessaoValida, setSessaoValida] = useState<boolean | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSessaoValida(!!session)
    })
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (senha.length < 6) { setErro('Senha deve ter no mínimo 6 caracteres.'); return }
    if (senha !== confirmar) { setErro('As senhas não coincidem.'); return }

    setErro('')
    setSalvando(true)

    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password: senha })

    setSalvando(false)

    if (error) {
      setErro('Não foi possível atualizar a senha. O link pode ter expirado.')
      return
    }

    setSucesso(true)
    setTimeout(() => router.push('/login'), 2500)
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-12"
      style={{ background: 'var(--color-cream)' }}
    >
      <div className="w-full max-w-sm animate-fade-up">

        <div className="flex flex-col items-center gap-3 mb-8">
          <Image src="/logo.png" alt="Alicerce" width={64} height={64} className="rounded-full" style={{ width: 64, height: 64 }} />
          <div className="text-center">
            <div className="text-xl font-semibold" style={{ fontFamily: 'var(--font-lora)', color: 'var(--color-ink)' }}>
              Alicerce
            </div>
            <div className="text-sm mt-0.5" style={{ color: 'var(--color-ink-soft)' }}>
              Nova senha
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
          {sucesso ? (
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
                Senha atualizada com sucesso.<br />Redirecionando para o login...
              </p>
            </div>
          ) : sessaoValida === false ? (
            <div className="text-center space-y-4">
              <p className="text-sm" style={{ color: '#B91C1C' }}>
                Link expirado ou inválido. Solicite um novo link de recuperação.
              </p>
              <a
                href="/recuperar-senha"
                className="text-sm font-medium block transition-opacity hover:opacity-70"
                style={{ color: 'var(--color-rose-main)' }}
              >
                Solicitar novo link
              </a>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-ink-mid)' }}>
                  Nova senha
                </label>
                <input
                  type="password"
                  value={senha}
                  onChange={e => setSenha(e.target.value)}
                  required
                  minLength={6}
                  placeholder="Mínimo 6 caracteres"
                  className="input-base"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-ink-mid)' }}>
                  Confirmar senha
                </label>
                <input
                  type="password"
                  value={confirmar}
                  onChange={e => setConfirmar(e.target.value)}
                  required
                  placeholder="Repita a nova senha"
                  className="input-base"
                />
              </div>

              {erro && <p className="text-sm" style={{ color: '#B91C1C' }}>{erro}</p>}

              <button
                type="submit"
                disabled={salvando}
                className="w-full py-2.5 rounded-xl text-sm font-medium text-white transition-all duration-200 disabled:opacity-60"
                style={{ background: 'var(--color-rose-main)' }}
              >
                {salvando ? 'Salvando...' : 'Salvar nova senha'}
              </button>

              <div className="text-center">
                <a href="/login" className="text-sm transition-opacity hover:opacity-70" style={{ color: 'var(--color-rose-main)' }}>
                  Cancelar
                </a>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
