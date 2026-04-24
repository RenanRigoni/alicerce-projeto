'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [mostrarSenha, setMostrarSenha] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    setCarregando(true)

    const supabase = createClient()
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha })

    if (error) {
      setErro('E-mail ou senha incorretos.')
      setCarregando(false)
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .single()

    const role = profile?.role
    if (role === 'pai')                               router.push('/portal/dashboard')
    else if (role === 'terapeuta')                    router.push('/terapia/dashboard')
    else if (role === 'admin' || role === 'recepcao') router.push('/admin/dashboard')
    else router.push('/login')
  }

  return (
    <div className="min-h-screen flex" style={{ background: '#FDF8F3' }}>

      {/* ── Painel esquerdo — visível só em desktop ── */}
      <div
        className="hidden lg:flex lg:w-[48%] xl:w-[44%] flex-col items-center justify-between p-12 relative overflow-hidden"
        style={{ background: 'linear-gradient(160deg, #FFFCF9 0%, #F0EDF8 60%, #FEF0E8 100%)' }}
      >
        {/* Bolhas decorativas de fundo */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-16 -left-16 w-72 h-72 rounded-full opacity-30"
            style={{ background: 'radial-gradient(circle, #F0B8B2 0%, transparent 70%)' }} />
          <div className="absolute top-1/3 -right-20 w-56 h-56 rounded-full opacity-25"
            style={{ background: 'radial-gradient(circle, #C4DEC0 0%, transparent 70%)' }} />
          <div className="absolute bottom-24 left-8 w-40 h-40 rounded-full opacity-20"
            style={{ background: 'radial-gradient(circle, #9B8EC4 0%, transparent 70%)' }} />
          <div className="absolute bottom-0 right-0 w-64 h-64 rounded-full opacity-15"
            style={{ background: 'radial-gradient(circle, #E8A07A 0%, transparent 70%)' }} />
        </div>

        {/* Logo horizontal — fundo neutro garante boa leitura das cores pastel */}
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center gap-10">
          <Image
            src="/logo_hor.png"
            alt="Alicerce Espaço Terapêutico Infantil"
            width={340}
            height={130}
            className="drop-shadow-sm"
            priority
            style={{ objectFit: 'contain' }}
          />

          {/* Tagline */}
          <div className="text-center space-y-2 max-w-xs">
            <p
              className="text-base leading-relaxed"
              style={{ color: '#A8978E', fontFamily: 'var(--font-dm-sans)' }}
            >
              Conectando famílias e terapeutas com cuidado e carinho
            </p>
          </div>

          {/* Dots decorativos */}
          <div className="flex gap-2.5">
            {['#F0B8B2', '#C4DEC0', '#9B8EC4', '#E8A07A', '#F0B8B2'].map((c, i) => (
              <div key={i} className="w-2 h-2 rounded-full" style={{ background: c }} />
            ))}
          </div>
        </div>

        {/* Rodapé esquerdo */}
        <div className="relative z-10 text-xs text-center" style={{ color: '#D4C8C3' }}>
          Alicerce Espaço Terapêutico Infantil
        </div>
      </div>

      {/* ── Painel direito — formulário ── */}
      <div className="flex-1 flex items-center justify-center px-5 py-10 sm:px-10">
        <div className="w-full max-w-sm">

          {/* Logo mobile */}
          <div className="flex flex-col items-center mb-10 lg:hidden">
            <div
              className="rounded-3xl p-3 mb-4 shadow-sm"
              style={{ background: 'linear-gradient(135deg, #FFFCF9, #F0EDF8)' }}
            >
              <Image
                src="/logo_ico.png"
                alt="Alicerce"
                width={88}
                height={88}
                className="drop-shadow-sm"
                priority
              />
            </div>
            <p className="text-sm" style={{ color: 'var(--color-ink-soft)' }}>
              Espaço Terapêutico Infantil
            </p>
          </div>

          {/* Cabeçalho */}
          <div className="mb-8">
            <h1
              className="text-2xl font-semibold mb-1"
              style={{ fontFamily: 'var(--font-lora)', color: 'var(--color-ink)' }}
            >
              Bem-vindo de volta
            </h1>
            <p className="text-sm" style={{ color: 'var(--color-ink-soft)' }}>
              Entre com suas credenciais para acessar o portal
            </p>
          </div>

          {/* Formulário */}
          <form onSubmit={handleLogin} className="space-y-4">

            {/* E-mail */}
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-ink-mid)' }}>
                E-mail
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="seu@email.com"
                className="w-full rounded-xl px-4 py-3 text-base outline-none transition-all duration-200"
                style={{
                  background: 'var(--color-warm-white)',
                  border: '1.5px solid var(--color-border)',
                  color: 'var(--color-ink)',
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

            {/* Senha */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-medium" style={{ color: 'var(--color-ink-mid)' }}>
                  Senha
                </label>
                <a
                  href="/recuperar-senha"
                  className="text-xs transition-opacity hover:opacity-70"
                  style={{ color: 'var(--color-rose-main)' }}
                >
                  Esqueci minha senha
                </a>
              </div>
              <div className="relative">
                <input
                  type={mostrarSenha ? 'text' : 'password'}
                  value={senha}
                  onChange={e => setSenha(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="w-full rounded-xl px-4 py-3 pr-11 text-base outline-none transition-all duration-200"
                  style={{
                    background: 'var(--color-warm-white)',
                    border: '1.5px solid var(--color-border)',
                    color: 'var(--color-ink)',
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
                <button
                  type="button"
                  onClick={() => setMostrarSenha(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 transition-opacity hover:opacity-60"
                  style={{ color: 'var(--color-ink-soft)' }}
                  aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {mostrarSenha ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Erro */}
            {erro && (
              <div
                className="flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm"
                style={{ background: '#FEF2F2', color: '#B91C1C', border: '1px solid #FECACA' }}
              >
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {erro}
              </div>
            )}

            {/* Botão entrar */}
            <button
              type="submit"
              disabled={carregando}
              className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all duration-200 disabled:opacity-60 active:scale-[0.99] cursor-pointer mt-2"
              style={{
                background: carregando
                  ? 'var(--color-rose-soft)'
                  : 'linear-gradient(135deg, var(--color-rose-main) 0%, #C4635C 100%)',
                boxShadow: carregando ? 'none' : '0 4px 14px rgba(212, 113, 106, 0.35)',
              }}
            >
              {carregando ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Entrando...
                </span>
              ) : 'Entrar'}
            </button>
          </form>

          {/* Rodapé */}
          <p className="text-center text-xs mt-8" style={{ color: 'var(--color-ink-faint)' }}>
            Alicerce Espaço Terapêutico Infantil
          </p>
        </div>
      </div>
    </div>
  )
}
