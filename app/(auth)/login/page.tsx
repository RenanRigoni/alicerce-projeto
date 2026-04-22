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
    <div
      className="min-h-screen flex"
      style={{ background: 'var(--color-cream)' }}
    >
      {/* Painel decorativo esquerdo */}
      <div
        className="hidden lg:flex lg:w-[45%] xl:w-[42%] flex-col relative overflow-hidden"
        style={{ background: 'var(--color-rose-blush)' }}
      >
        {/* Formas decorativas */}
        <div
          className="absolute -top-20 -left-20 w-96 h-96 rounded-full opacity-40"
          style={{ background: 'var(--color-rose-soft)' }}
        />
        <div
          className="absolute top-1/3 -right-16 w-64 h-64 rounded-full opacity-30"
          style={{ background: 'var(--color-peach-main)' }}
        />
        <div
          className="absolute -bottom-12 left-1/4 w-80 h-80 rounded-full opacity-25"
          style={{ background: 'var(--color-rose-muted)' }}
        />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 rounded-full opacity-20"
          style={{ background: 'var(--color-lavender-main)' }}
        />

        {/* Conteúdo do painel */}
        <div className="relative z-10 flex flex-col justify-between h-full p-12">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="Alicerce" width={44} height={44} className="rounded-full" />
            <span
              className="text-xl font-semibold"
              style={{ fontFamily: 'var(--font-lora)', color: 'var(--color-ink)' }}
            >
              Alicerce
            </span>
          </div>

          {/* Logo grande central */}
          <div className="flex flex-col items-center gap-6">
            <Image
              src="/logo.png"
              alt="Alicerce Espaço Terapêutico Infantil"
              width={180}
              height={180}
              className="drop-shadow-sm"
              priority
            />
            <div className="space-y-2 text-center">
              <h1
                className="text-3xl font-semibold leading-snug"
                style={{ fontFamily: 'var(--font-lora)', color: 'var(--color-ink)' }}
              >
                Acompanhamento<br />
                <span style={{ color: 'var(--color-rose-main)' }}>terapêutico</span><br />
                com cuidado
              </h1>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--color-ink-mid)' }}>
                Conectando famílias, terapeutas e a clínica.
              </p>
            </div>
          </div>

          {/* Detalhe inferior */}
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5">
              {['bg-[var(--color-rose-main)]', 'bg-[var(--color-rose-soft)]', 'bg-[var(--color-rose-muted)]'].map((c, i) => (
                <div key={i} className={`w-2 h-2 rounded-full ${c}`} />
              ))}
            </div>
            <span className="text-xs" style={{ color: 'var(--color-ink-soft)' }}>
              Alicerce Espaço Terapêutico Infantil
            </span>
          </div>
        </div>
      </div>

      {/* Painel do formulário */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm animate-fade-up">

          {/* Logo mobile */}
          <div className="flex items-center gap-2 mb-10 lg:hidden">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-bold shadow-sm"
              style={{ background: 'var(--color-rose-main)' }}
            >
              A
            </div>
            <span
              className="text-lg font-semibold"
              style={{ fontFamily: 'var(--font-lora)', color: 'var(--color-ink)' }}
            >
              Alicerce
            </span>
          </div>

          {/* Cabeçalho */}
          <div className="mb-8">
            <h2
              className="text-2xl font-semibold mb-1"
              style={{ fontFamily: 'var(--font-lora)', color: 'var(--color-ink)' }}
            >
              Bem-vindo de volta
            </h2>
            <p className="text-sm" style={{ color: 'var(--color-ink-soft)' }}>
              Entre com suas credenciais para acessar o portal
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            {/* E-mail */}
            <div>
              <label
                className="block text-sm font-medium mb-1.5"
                style={{ color: 'var(--color-ink-mid)' }}
              >
                E-mail
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="seu@email.com"
                className="w-full rounded-xl px-4 py-2.5 text-sm transition-all duration-200"
                style={{
                  background: 'var(--color-warm-white)',
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

            {/* Senha */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  className="text-sm font-medium"
                  style={{ color: 'var(--color-ink-mid)' }}
                >
                  Senha
                </label>
                <a
                  href="/recuperar-senha"
                  className="text-xs transition-colors hover:opacity-80"
                  style={{ color: 'var(--color-rose-main)' }}
                >
                  Esqueci minha senha
                </a>
              </div>
              <input
                type="password"
                value={senha}
                onChange={e => setSenha(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full rounded-xl px-4 py-2.5 text-sm transition-all duration-200"
                style={{
                  background: 'var(--color-warm-white)',
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

            {/* Erro */}
            {erro && (
              <div
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm"
                style={{ background: '#FEF2F2', color: '#B91C1C', border: '1px solid #FECACA' }}
              >
                <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                {erro}
              </div>
            )}

            {/* Botão */}
            <button
              type="submit"
              disabled={carregando}
              className="w-full py-2.5 rounded-xl text-sm font-medium text-white transition-all duration-200 disabled:opacity-60 active:scale-[0.99]"
              style={{
                background: carregando ? 'var(--color-rose-soft)' : 'var(--color-rose-main)',
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
        </div>
      </div>
    </div>
  )
}
