'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'

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
    { href: '/admin/auditoria',       label: 'Auditoria' },
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
            className="flex items-center gap-2 shrink-0"
            style={{ textDecoration: 'none' }}
          >
            <Image
              src="/logo.png"
              alt="Alicerce"
              width={36}
              height={36}
              className="rounded-full shrink-0"
              priority
            />
            <span
              className="text-base font-semibold tracking-tight hidden sm:block"
              style={{
                fontFamily: 'var(--font-lora)',
                color: 'var(--color-ink)',
              }}
            >
              Alicerce
            </span>
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

          {/* Direita: avatar + user menu */}
          <div className="flex items-center gap-2">
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

        {/* Menu mobile */}
        <div
          className="sm:hidden overflow-hidden transition-all duration-300"
          style={{
            maxHeight: menuAberto ? '400px' : '0',
            borderTop: menuAberto ? `1px solid var(--color-border)` : 'none',
          }}
        >
          <div className="px-4 py-3 space-y-1">
            {links.map(link => (
              <a
                key={link.href}
                href={link.href}
                className="flex items-center px-3 py-2.5 rounded-xl text-sm transition-all"
                style={{
                  color: isActive(link.href) ? 'var(--color-rose-main)' : 'var(--color-ink-mid)',
                  background: isActive(link.href) ? 'var(--color-rose-blush)' : 'transparent',
                  fontWeight: isActive(link.href) ? '500' : '400',
                }}
              >
                {link.label}
              </a>
            ))}
            <div
              className="pt-2 mt-1 border-t"
              style={{ borderColor: 'var(--color-border-soft)' }}
            >
              <div className="flex items-center gap-2 px-3 py-2 mb-1">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${avatarColors[role]}`}>
                  {initials(nome)}
                </div>
                <span className="text-xs" style={{ color: 'var(--color-ink-soft)' }}>{nome}</span>
              </div>
              <button
                onClick={handleLogout}
                className="w-full text-left px-3 py-2 text-sm rounded-xl transition-colors hover:bg-[var(--color-border-soft)]"
                style={{ color: 'var(--color-ink-mid)' }}
              >
                Sair da conta
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Overlay para fechar menus */}
      {(menuAberto || userMenuAberto) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => { setMenuAberto(false); setUserMenuAberto(false) }}
        />
      )}
    </>
  )
}
