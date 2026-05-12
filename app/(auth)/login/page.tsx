'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'

function isCPF(valor: string): boolean {
  const digits = valor.replace(/\D/g, '')
  return digits.length === 11
}

async function resolverEmail(identificador: string): Promise<string | null> {
  if (!isCPF(identificador)) return identificador

  const res = await fetch('/api/auth/email-from-cpf', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cpf: identificador }),
  })

  if (!res.ok) return null
  const { email } = await res.json()
  return email ?? null
}

export default function LoginPage() {
  const router = useRouter()
  const [identificador, setIdentificador] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [mostrarSenha, setMostrarSenha] = useState(false)

  async function handleLogin(e?: React.FormEvent) {
    e?.preventDefault()
    if (carregando) return
    setErro('')
    setCarregando(true)

    const email = await resolverEmail(identificador.trim())
    if (!email) {
      setErro('CPF não encontrado ou não autorizado.')
      setCarregando(false)
      return
    }

    const supabase = createClient()
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha })
    if (error) { setErro('E-mail, CPF ou senha incorretos.'); setCarregando(false); return }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, ativo')
      .eq('id', data.user.id)
      .single()

    if (!profile?.ativo) {
      await supabase.auth.signOut()
      setErro('Usuário desativado. Entre em contato.')
      setCarregando(false)
      return
    }

    const role = profile?.role
    if (role === 'pai')                               router.push('/portal/dashboard')
    else if (role === 'terapeuta')                    router.push('/terapia/dashboard')
    else if (role === 'admin' || role === 'recepcao') router.push('/admin/dashboard')
    else router.push('/login')
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (identificador && senha) handleLogin()
    }
  }

  return (
    <>
      <style>{`
        @keyframes blob-drift-1 {
          0%,100% { transform: translate(0,0) scale(1); }
          33%      { transform: translate(40px,-30px) scale(1.08); }
          66%      { transform: translate(-20px,20px) scale(0.95); }
        }
        @keyframes blob-drift-2 {
          0%,100% { transform: translate(0,0) scale(1); }
          33%      { transform: translate(-50px,25px) scale(1.06); }
          66%      { transform: translate(30px,-15px) scale(0.97); }
        }
        @keyframes blob-drift-3 {
          0%,100% { transform: translate(0,0) scale(1); }
          50%      { transform: translate(25px,-40px) scale(1.1); }
        }
        @keyframes blob-drift-4 {
          0%,100% { transform: translate(0,0) scale(1); }
          50%      { transform: translate(-30px,30px) scale(1.05); }
        }
        .blob-1 { animation: blob-drift-1 14s ease-in-out infinite; }
        .blob-2 { animation: blob-drift-2 18s ease-in-out infinite; }
        .blob-3 { animation: blob-drift-3 12s ease-in-out infinite; }
        .blob-4 { animation: blob-drift-4 16s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .blob-1,.blob-2,.blob-3,.blob-4 { animation: none; }
        }

        .glass-card {
          backdrop-filter: blur(40px) saturate(180%);
          -webkit-backdrop-filter: blur(40px) saturate(180%);
          background: rgba(255,255,255,0.42);
          border: 1px solid rgba(255,255,255,0.70);
          box-shadow:
            0 32px 64px rgba(44,32,24,0.12),
            0 8px 24px rgba(44,32,24,0.06),
            inset 0 1.5px 0 rgba(255,255,255,0.90),
            inset 0 -1px 0 rgba(255,255,255,0.25);
        }

        .glass-input {
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          background: rgba(255,255,255,0.65);
          border: 1.5px solid rgba(255,255,255,0.75);
          transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
        }
        .glass-input:focus {
          outline: none;
          background: rgba(255,255,255,0.85);
          border-color: rgba(212,113,106,0.55);
          box-shadow: 0 0 0 3px rgba(212,113,106,0.15);
        }

        .logo-wrap {
          overflow: hidden;
          box-shadow:
            0 20px 48px rgba(44,32,24,0.18),
            0 6px 16px rgba(44,32,24,0.10),
            0 0 0 1.5px rgba(255,255,255,0.70),
            inset 0 1.5px 0 rgba(255,255,255,0.95);
        }

        .btn-entrar {
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          transition: opacity 0.2s, transform 0.15s, box-shadow 0.2s;
        }
        .btn-entrar:hover:not(:disabled) {
          opacity: 0.92;
          box-shadow: 0 6px 20px rgba(212,113,106,0.45), inset 0 1px 0 rgba(255,255,255,0.30);
        }
        .btn-entrar:active:not(:disabled) {
          transform: scale(0.985);
        }
      `}</style>

      {/* Fundo pastel animado */}
      <div
        className="fixed inset-0 overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #FDF8F3 0%, #F3EAE0 50%, #EDE4F5 100%)' }}
        aria-hidden="true"
      >
        <div className="blob-1 absolute -top-40 -left-40 w-[560px] h-[560px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(240,184,178,0.65) 0%, rgba(240,184,178,0) 70%)' }} />
        <div className="blob-2 absolute top-1/3 -right-40 w-[500px] h-[500px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(155,142,196,0.50) 0%, rgba(155,142,196,0) 70%)' }} />
        <div className="blob-3 absolute -bottom-24 left-1/4 w-[460px] h-[460px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(196,222,192,0.60) 0%, rgba(196,222,192,0) 70%)' }} />
        <div className="blob-4 absolute bottom-16 -right-16 w-[380px] h-[380px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(232,160,122,0.45) 0%, rgba(232,160,122,0) 70%)' }} />
      </div>

      {/* Layout */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4 sm:p-6">
        <div className="glass-card w-full max-w-sm rounded-3xl px-8 py-10 flex flex-col items-center">

          {/* Logo ícone */}
          <div className="logo-wrap rounded-3xl mb-6" style={{ width: 130, height: 130 }}>
            <Image
              src="/logo_ico.png"
              alt="Alicerce"
              width={130}
              height={130}
              priority
              style={{ objectFit: 'cover', width: 130, height: 130, display: 'block' }}
            />
          </div>

          {/* Título */}
          <h1
            className="text-2xl font-semibold mb-1 text-center"
            style={{ fontFamily: 'var(--font-lora)', color: '#2C2018' }}
          >
            Bem-vindo de volta
          </h1>
          <p className="text-sm text-center mb-8" style={{ color: '#A8978E' }}>
            Cuidando de cada passo com amor
          </p>

          <form onSubmit={handleLogin} className="w-full space-y-4">

            {/* E-mail ou CPF */}
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: '#6B5B4E' }}>
                E-mail ou CPF
              </label>
              <input
                type="text"
                value={identificador}
                onChange={e => setIdentificador(e.target.value)}
                onKeyDown={handleKeyDown}
                required
                autoComplete="username"
                placeholder="seu@email.com ou 000.000.000-00"
                className="glass-input w-full rounded-xl px-4 py-3 text-sm"
                style={{ color: '#2C2018' }}
              />
              <p className="text-xs mt-1" style={{ color: '#C8B8B0' }}>
                Responsáveis podem usar CPF para entrar
              </p>
            </div>

            {/* Senha */}
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: '#6B5B4E' }}>Senha</label>
              <div className="relative">
                <input
                  type={mostrarSenha ? 'text' : 'password'}
                  value={senha}
                  onChange={e => setSenha(e.target.value)}
                  onKeyDown={handleKeyDown}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="glass-input w-full rounded-xl px-4 py-3 pr-12 text-sm"
                  style={{ color: '#2C2018' }}
                />
                <button
                  type="button"
                  onClick={() => setMostrarSenha(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-opacity hover:opacity-60 cursor-pointer"
                  style={{ color: '#A8978E' }}
                  aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {mostrarSenha ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>
              <div className="flex justify-end mt-1.5">
                <a
                  href="/recuperar-senha"
                  className="text-xs transition-opacity hover:opacity-70 cursor-pointer"
                  style={{ color: '#D4716A' }}
                >
                  Esqueci minha senha
                </a>
              </div>
            </div>

            {/* Erro */}
            {erro && (
              <div
                className="flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm"
                style={{
                  background: 'rgba(254,242,242,0.85)',
                  color: '#B91C1C',
                  border: '1px solid rgba(254,202,202,0.80)',
                  backdropFilter: 'blur(8px)',
                }}
              >
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                {erro}
              </div>
            )}

            {/* Botão */}
            <button
              type="submit"
              disabled={carregando}
              className="btn-entrar w-full py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-60 cursor-pointer mt-1"
              style={{
                background: carregando
                  ? 'rgba(240,184,178,0.85)'
                  : 'linear-gradient(135deg, rgba(212,113,106,0.95) 0%, rgba(178,82,76,0.98) 100%)',
                border: '1px solid rgba(255,255,255,0.30)',
                boxShadow: carregando ? 'none' : '0 4px 16px rgba(212,113,106,0.35), inset 0 1px 0 rgba(255,255,255,0.25)',
              }}
            >
              {carregando ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Entrando...
                </span>
              ) : 'Entrar'}
            </button>
          </form>

          {/* Rodapé */}
          <div className="text-center mt-8 space-y-1.5">
            <p className="text-xs" style={{ color: '#C8B8B0' }}>
              Alicerce Espaço Terapêutico Infantil
            </p>
            <a
              href="/privacidade"
              className="text-xs transition-opacity hover:opacity-70"
              style={{ color: '#D4716A' }}
            >
              Política de Privacidade
            </a>
          </div>
        </div>
      </div>
    </>
  )
}
