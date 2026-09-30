'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'

const SENHA_INICIAL = 'alicerce'

export function DefinirSenhaForm({ dashboard }: { dashboard: string }) {
  const router = useRouter()
  const [senha, setSenha] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  // A senha já foi trocada no Auth, mas o registro da troca falhou. Nesse caso
  // reenviar a mesma senha daria "same_password"; a nova tentativa só registra.
  const [senhaTrocada, setSenhaTrocada] = useState(false)

  async function registrarTroca(): Promise<boolean> {
    const res = await fetch('/api/auth/senha-definida', { method: 'POST' })
    return res.ok
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!senhaTrocada) {
      if (senha.length < 6) { setErro('Senha deve ter no mínimo 6 caracteres.'); return }
      if (senha !== confirmar) { setErro('As senhas não coincidem.'); return }
      if (senha.trim().toLowerCase() === SENHA_INICIAL) {
        setErro('Escolha uma senha diferente da senha inicial.')
        return
      }
    }

    setErro('')
    setSalvando(true)

    if (!senhaTrocada) {
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({ password: senha })

      if (error) {
        setSalvando(false)
        setErro(
          error.code === 'same_password'
            ? 'Escolha uma senha diferente da senha atual.'
            : 'Não foi possível definir a senha. Tente novamente.'
        )
        return
      }
      setSenhaTrocada(true)
    }

    if (!(await registrarTroca())) {
      setSalvando(false)
      setErro('Sua senha foi alterada, mas não conseguimos concluir o registro. Clique em continuar para tentar de novo.')
      return
    }

    router.replace(dashboard)
  }

  async function handleSair() {
    await createClient().auth.signOut()
    router.replace('/login')
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
              Defina sua senha
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
          <p className="text-sm mb-5" style={{ color: 'var(--color-ink-mid)' }}>
            A senha que você usou para entrar é provisória. Defina uma senha só sua para continuar.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!senhaTrocada && (
              <>
                <div>
                  <label htmlFor="nova-senha" className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-ink-mid)' }}>
                    Nova senha
                  </label>
                  <input
                    id="nova-senha"
                    type="password"
                    value={senha}
                    onChange={e => setSenha(e.target.value)}
                    required
                    minLength={6}
                    autoComplete="new-password"
                    placeholder="Mínimo 6 caracteres"
                    className="input-base"
                  />
                </div>

                <div>
                  <label htmlFor="confirmar-senha" className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-ink-mid)' }}>
                    Confirmar nova senha
                  </label>
                  <input
                    id="confirmar-senha"
                    type="password"
                    value={confirmar}
                    onChange={e => setConfirmar(e.target.value)}
                    required
                    autoComplete="new-password"
                    placeholder="Repita a nova senha"
                    className="input-base"
                  />
                </div>
              </>
            )}

            {erro && <p className="text-sm" style={{ color: '#B91C1C' }}>{erro}</p>}

            <button
              type="submit"
              disabled={salvando}
              className="w-full py-2.5 rounded-xl text-sm font-medium text-white transition-all duration-200 disabled:opacity-60"
              style={{ background: 'var(--color-rose-main)' }}
            >
              {salvando ? 'Salvando...' : senhaTrocada ? 'Continuar' : 'Salvar nova senha'}
            </button>

            <div className="text-center">
              <button
                type="button"
                onClick={handleSair}
                className="text-sm transition-opacity hover:opacity-70"
                style={{ color: 'var(--color-rose-main)' }}
              >
                Sair
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
