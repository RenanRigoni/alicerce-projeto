'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { NotificacoesBell } from '@/components/ui/NotificacoesBell'

interface NavbarProps {
  role: 'admin' | 'recepcao' | 'terapeuta' | 'pai'
  nome: string
}

const dashboardByRole = {
  admin:     '/admin/dashboard',
  recepcao:  '/admin/dashboard',
  terapeuta: '/terapia/dashboard',
  pai:       '/portal/dashboard',
}

const navLinks = {
  admin: [
    { href: '/admin/dashboard',       label: 'Início' },
    { href: '/admin/pacientes',       label: 'Pacientes' },
    { href: '/admin/responsaveis',    label: 'Responsáveis' },
    { href: '/admin/terapeutas',      label: 'Terapeutas' },
    { href: '/admin/agendamentos',    label: 'Agenda' },
    { href: '/admin/feriados',        label: 'Feriados' },
    { href: '/admin/comunicados',     label: 'Comunicados' },
    { href: '/admin/usuarios',        label: 'Usuários' },
  ],
  recepcao: [
    { href: '/admin/dashboard',       label: 'Início' },
    { href: '/admin/pacientes',       label: 'Pacientes' },
    { href: '/admin/responsaveis',    label: 'Responsáveis' },
    { href: '/admin/terapeutas',      label: 'Terapeutas' },
    { href: '/admin/agendamentos',    label: 'Agenda' },
    { href: '/admin/feriados',        label: 'Feriados' },
    { href: '/admin/comunicados',     label: 'Comunicados' },
    { href: '/admin/usuarios',        label: 'Usuários' },
  ],
  terapeuta: [
    { href: '/terapia/dashboard',     label: 'Início' },
    { href: '/terapia/agenda',        label: 'Agenda' },
    { href: '/terapia/pacientes',     label: 'Pacientes' },
    { href: '/terapia/responsaveis',  label: 'Responsáveis' },
  ],
  pai: [
    { href: '/portal/dashboard',  label: 'Início' },
  ],
}

// Iniciais do nome para avatar
function initials(nome: string) {
  return nome.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
}

// Cor do avatar por role
const avatarColors = {
  admin:     'bg-[var(--color-rose-blush)] text-[var(--color-rose-deep)]',
  recepcao:  'bg-amber-50 text-amber-700',
  terapeuta: 'bg-[var(--color-sage-light)] text-[var(--color-sage-deep)]',
  pai:       'bg-[var(--color-peach-light)] text-[var(--color-peach-main)]',
}

export function Navbar({ role, nome }: NavbarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const links = navLinks[role] ?? []
  const [menuAberto, setMenuAberto] = useState(false)
  const [userMenuAberto, setUserMenuAberto] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Fecha menus ao mudar de rota
  useEffect(() => {
    setMenuAberto(false)
    setUserMenuAberto(false)
  }, [pathname])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + '/')
  }

  return (
    <>
      <nav
        className="sticky top-0 z-50 transition-all duration-300"
        style={{
          background: 'var(--color-warm-white)',
          borderBottom: `1px solid var(--color-border)`,
          boxShadow: scrolled ? '0 2px 20px rgba(44,32,24,0.08)' : 'none',
        }}
      >
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-4">

          {/* Logo */}
          <a
            href={dashboardByRole[role]}
            className="flex items-center shrink-0"
            style={{ textDecoration: 'none' }}
          >
            <Image
              src="/logo_hor.png"
              alt="Alicerce"
              width={130}
              height={50}
              priority
              style={{ objectFit: 'contain', height: 36, width: 'auto' }}
            />
          </a>

          {/* Links desktop */}
          <div className="hidden sm:flex items-center gap-0.5 flex-1 ml-4">
            {links.map(link => (
              <a
                key={link.href}
                href={link.href}
                className="relative px-3 py-1.5 text-sm rounded-lg transition-all duration-200"
                style={{
                  color: isActive(link.href)
                    ? 'var(--color-rose-main)'
                    : 'var(--color-ink-mid)',
                  background: isActive(link.href)
                    ? 'var(--color-rose-blush)'
                    : 'transparent',
                  fontWeight: isActive(link.href) ? '500' : '400',
                }}
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Direita: sino + avatar + user menu */}
          <div className="flex items-center gap-2">
            <div className="hidden sm:block">
              <NotificacoesBell />
            </div>

            {/* Avatar button */}
            <div className="relative hidden sm:block">
              <button
                onClick={() => setUserMenuAberto(v => !v)}
                className="flex items-center gap-2 px-2 py-1 rounded-xl transition-all duration-200 hover:bg-[var(--color-border-soft)]"
              >
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ${avatarColors[role]}`}
                >
                  {initials(nome)}
                </div>
                <span className="text-sm max-w-[120px] truncate" style={{ color: 'var(--color-ink-mid)' }}>
                  {nome.split(' ')[0]}
                </span>
                <svg
                  className={`w-3.5 h-3.5 transition-transform duration-200 ${userMenuAberto ? 'rotate-180' : ''}`}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  style={{ color: 'var(--color-ink-soft)' }}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Dropdown */}
              {userMenuAberto && (
                <div
                  className="absolute right-0 top-full mt-2 w-52 rounded-2xl py-1 z-50"
                  style={{
                    background: 'var(--color-warm-white)',
                    border: '1px solid var(--color-border)',
                    boxShadow: '0 8px 32px rgba(44,32,24,0.12)',
                  }}
                >
                  <div className="px-4 py-2.5 border-b" style={{ borderColor: 'var(--color-border-soft)' }}>
                    <div className="text-xs font-medium truncate" style={{ color: 'var(--color-ink)' }}>{nome}</div>
                    <div className="text-xs mt-0.5" style={{ color: 'var(--color-ink-soft)' }}>
                      {role === 'admin' ? 'Administrador' : role === 'recepcao' ? 'Recepção' : role === 'terapeuta' ? 'Terapeuta' : 'Família'}
                    </div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-[var(--color-border-soft)]"
                    style={{ color: 'var(--color-ink-mid)' }}
                  >
                    Sair da conta
                  </button>
                </div>
              )}
            </div>

            {/* Hamburger mobile */}
            <button
              onClick={() => setMenuAberto(v => !v)}
              className="sm:hidden flex flex-col gap-1.5 p-2 rounded-lg hover:bg-[var(--color-border-soft)] transition-colors"
              aria-label="Menu"
            >
              <span
                className="block w-5 h-0.5 rounded-full transition-all duration-300"
                style={{
                  background: 'var(--color-ink-mid)',
                  transform: menuAberto ? 'rotate(45deg) translateY(7px)' : 'none',
                }}
              />
              <span
                className="block w-5 h-0.5 rounded-full transition-all duration-300"
                style={{
                  background: 'var(--color-ink-mid)',
                  opacity: menuAberto ? 0 : 1,
                }}
              />
              <span
                className="block w-5 h-0.5 rounded-full transition-all duration-300"
                style={{
                  background: 'var(--color-ink-mid)',
                  transform: menuAberto ? 'rotate(-45deg) translateY(-7px)' : 'none',
                }}
              />
            </button>
          </div>
        </div>

      </nav>

      {/* Overlay para fechar user menu desktop */}
      {userMenuAberto && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setUserMenuAberto(false)}
        />
      )}

      {/* Menu mobile full-screen */}
      {menuAberto && (
        <div
          className="fixed inset-0 z-50 flex flex-col sm:hidden"
          style={{ background: 'var(--color-warm-white)' }}
        >
          {/* Cabeçalho do overlay */}
          <div
            className="h-14 flex items-center justify-between px-4 shrink-0"
            style={{ borderBottom: '1px solid var(--color-border)' }}
          >
            <a href={dashboardByRole[role]} className="flex items-center" style={{ textDecoration: 'none' }}>
              <Image src="/logo_hor.png" alt="Alicerce" width={130} height={50} priority style={{ objectFit: 'contain', height: 36, width: 'auto' }} />
            </a>
            <button
              onClick={() => setMenuAberto(false)}
              className="p-2 rounded-lg transition-colors hover:bg-[var(--color-border-soft)]"
              aria-label="Fechar menu"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--color-ink-mid)' }}>
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Links — scroll se necessário */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1">
            {links.map(link => (
              <a
                key={link.href}
                href={link.href}
                className="flex items-center px-4 py-3 rounded-xl text-sm transition-all"
                style={{
                  color: isActive(link.href) ? 'var(--color-rose-main)' : 'var(--color-ink-mid)',
                  background: isActive(link.href) ? 'var(--color-rose-blush)' : 'transparent',
                  fontWeight: isActive(link.href) ? '500' : '400',
                }}
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Rodapé: usuário + sino + sair */}
          <div
            className="shrink-0 px-4 py-4 space-y-3"
            style={{ borderTop: '1px solid var(--color-border)' }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${avatarColors[role]}`}>
                  {initials(nome)}
                </div>
                <div>
                  <div className="text-sm font-medium leading-tight" style={{ color: 'var(--color-ink)' }}>{nome}</div>
                  <div className="text-xs" style={{ color: 'var(--color-ink-soft)' }}>
                    {role === 'admin' ? 'Administrador' : role === 'recepcao' ? 'Recepção' : role === 'terapeuta' ? 'Terapeuta' : 'Família'}
                  </div>
                </div>
              </div>
              <NotificacoesBell />
            </div>
            <button
              onClick={handleLogout}
              className="w-full py-3 rounded-xl text-sm font-medium transition-colors"
              style={{
                background: 'var(--color-rose-blush)',
                color: 'var(--color-rose-main)',
              }}
            >
              Sair da conta
            </button>
          </div>
        </div>
      )}
    </>
  )
}
