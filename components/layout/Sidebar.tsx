'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { NotificacoesBell } from '@/components/ui/NotificacoesBell'
import { PushNotificationSettings } from '@/components/ui/PushNotificationSettings'
import {
  LayoutDashboard,
  Users,
  HeartHandshake,
  Stethoscope,
  CalendarDays,
  CalendarOff,
  Megaphone,
  ScrollText,
  ShieldCheck,
  CircleUserRound,
  LogOut,
  Menu,
  X,
  Settings,
  type LucideIcon,
} from 'lucide-react'

interface SidebarProps {
  role: 'admin' | 'recepcao' | 'terapeuta' | 'pai'
  nome: string
  fotoUrl?: string | null
  permissoes?: Record<string, boolean>
}

interface NavItem {
  href: string
  label: string
  icon: LucideIcon
  permission: string | null
}

const navConfig: Record<string, NavItem[]> = {
  admin: [
    { href: '/admin/dashboard',    label: 'Início',        icon: LayoutDashboard, permission: null },
    { href: '/admin/pacientes',    label: 'Pacientes',     icon: Users,           permission: 'ver_todos_pacientes' },
    { href: '/admin/responsaveis', label: 'Responsáveis',  icon: HeartHandshake,  permission: 'gerenciar_responsaveis' },
    { href: '/admin/terapeutas',   label: 'Profissionais', icon: Stethoscope,     permission: 'gerenciar_usuarios' },
    { href: '/admin/agendamentos', label: 'Agenda',        icon: CalendarDays,    permission: 'criar_agendamentos' },
    { href: '/admin/feriados',     label: 'Feriados',      icon: CalendarOff,     permission: 'gerenciar_feriados' },
    { href: '/admin/comunicados',  label: 'Comunicados',   icon: Megaphone,       permission: 'criar_comunicados' },
    { href: '/admin/auditoria',     label: 'Auditoria',      icon: ScrollText,  permission: 'ver_auditoria' },
    { href: '/admin/usuarios',      label: 'Usuários',       icon: ShieldCheck, permission: 'gerenciar_usuarios' },
    { href: '/admin/configuracoes', label: 'Configurações',  icon: Settings,    permission: null },
  ],
  recepcao: [
    { href: '/admin/dashboard',    label: 'Início',        icon: LayoutDashboard, permission: null },
    { href: '/admin/pacientes',    label: 'Pacientes',     icon: Users,           permission: 'ver_todos_pacientes' },
    { href: '/admin/responsaveis', label: 'Responsáveis',  icon: HeartHandshake,  permission: 'gerenciar_responsaveis' },
    { href: '/admin/terapeutas',   label: 'Profissionais', icon: Stethoscope,     permission: 'gerenciar_usuarios' },
    { href: '/admin/agendamentos', label: 'Agenda',        icon: CalendarDays,    permission: 'criar_agendamentos' },
    { href: '/admin/feriados',     label: 'Feriados',      icon: CalendarOff,     permission: 'gerenciar_feriados' },
    { href: '/admin/comunicados',  label: 'Comunicados',   icon: Megaphone,       permission: 'criar_comunicados' },
    { href: '/admin/auditoria',    label: 'Auditoria',     icon: ScrollText,      permission: 'ver_auditoria' },
    { href: '/admin/usuarios',     label: 'Usuários',      icon: ShieldCheck,     permission: 'gerenciar_usuarios' },
  ],
  terapeuta: [
    { href: '/terapia/dashboard',    label: 'Início',       icon: LayoutDashboard, permission: null },
    { href: '/terapia/agenda',       label: 'Agenda',       icon: CalendarDays,    permission: null },
    { href: '/terapia/pacientes',    label: 'Pacientes',    icon: Users,           permission: null },
    { href: '/terapia/responsaveis', label: 'Responsáveis', icon: HeartHandshake,  permission: 'gerenciar_responsaveis' },
  ],
  pai: [
    { href: '/portal/dashboard',   label: 'Início',     icon: LayoutDashboard, permission: null },
    { href: '/portal/meu-perfil',  label: 'Meu Perfil', icon: CircleUserRound, permission: null },
  ],
}

const dashboardByRole: Record<string, string> = {
  admin:     '/admin/dashboard',
  recepcao:  '/admin/dashboard',
  terapeuta: '/terapia/dashboard',
  pai:       '/portal/dashboard',
}

const avatarColors: Record<string, string> = {
  admin:     'bg-[var(--color-rose-blush)] text-[var(--color-rose-deep)]',
  recepcao:  'bg-amber-50 text-amber-700',
  terapeuta: 'bg-[var(--color-sage-light)] text-[var(--color-sage-deep)]',
  pai:       'bg-[var(--color-peach-light)] text-[var(--color-peach-main)]',
}

const roleLabel: Record<string, string> = {
  admin:     'Administrador',
  recepcao:  'Recepção',
  terapeuta: 'Profissional',
  pai:       'Família',
}

function initials(nome: string) {
  return nome.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
}

export function Sidebar({ role, nome, fotoUrl, permissoes = {} }: SidebarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [userMenuPos, setUserMenuPos] = useState<{ left: number; bottom: number } | null>(null)
  const [tooltip, setTooltip] = useState<{ label: string; y: number } | null>(null)
  const avatarRef = useRef<HTMLButtonElement>(null)

  const profileUrl: Record<string, string> = {
    admin:     '/admin/meu-perfil',
    recepcao:  '/admin/meu-perfil',
    terapeuta: '/terapia/meu-perfil',
    pai:       '/portal/meu-perfil',
  }

  const items = (navConfig[role] ?? []).filter(item =>
    !item.permission || permissoes[item.permission] === true
  )

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + '/')
  }

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  function showTooltip(e: React.MouseEvent<HTMLDivElement>, label: string) {
    const rect = e.currentTarget.getBoundingClientRect()
    setTooltip({ label, y: rect.top + rect.height / 2 })
  }

  function closeExpanded() {
    setExpanded(false)
    setTooltip(null)
  }

  return (
    <>
      {/* ── Tooltip fixo — só no modo collapsed ── */}
      {tooltip && !expanded && (
        <div
          className="hidden lg:block"
          style={{
            position: 'fixed',
            left: 72,
            top: tooltip.y,
            transform: 'translateY(-50%)',
            zIndex: 9999,
            pointerEvents: 'none',
            background: 'var(--color-ink)',
            color: '#fff',
            borderRadius: 8,
            padding: '5px 11px',
            fontSize: 15,
            fontWeight: 500,
            whiteSpace: 'nowrap',
            boxShadow: '0 4px 14px rgba(0,0,0,0.18)',
          }}
        >
          {tooltip.label}
          <span
            style={{
              position: 'absolute',
              right: '100%',
              top: '50%',
              transform: 'translateY(-50%)',
              border: '5px solid transparent',
              borderRightColor: 'var(--color-ink)',
            }}
          />
        </div>
      )}

      {/* ── Desktop sidebar ─────────────────────────────────── */}
      <aside
        className="fixed left-0 top-0 bottom-0 z-50 hidden lg:flex flex-col overflow-hidden"
        style={{
          width: expanded ? 240 : 64,
          transition: 'width 200ms ease',
          background: 'var(--color-warm-white)',
          borderRight: '1px solid var(--color-border)',
        }}
      >
        {/* ── Header ── */}
        <div
          className="shrink-0"
          style={{ borderBottom: '1px solid var(--color-border-soft)' }}
        >
          {expanded ? (
            /* Expandido: logo horizontal + botão X */
            <div className="h-14 flex items-center justify-between px-3 gap-2">
              <Link
                href={dashboardByRole[role]}
                onClick={closeExpanded}
                className="flex items-center hover:opacity-75 transition-opacity shrink-0"
              >
                <Image
                  src="/LOGO_H_HIGH.png"
                  alt="Alicerce"
                  width={140}
                  height={40}
                  priority
                  style={{ objectFit: 'contain', height: 40, width: 'auto' }}
                />
              </Link>
              <button
                onClick={closeExpanded}
                className="p-2 rounded-lg hover:bg-[var(--color-border-soft)] transition-colors shrink-0"
                aria-label="Fechar menu"
              >
                <X size={18} style={{ color: 'var(--color-ink-mid)' }} />
              </button>
            </div>
          ) : (
            /* Collapsed: logo ícone + botão hambúrguer */
            <div className="flex flex-col items-center">
              <Link
                href={dashboardByRole[role]}
                className="w-16 h-12 flex items-center justify-center hover:opacity-75 transition-opacity"
              >
                <Image
                  src="/APP_ICO.png"
                  alt="Alicerce"
                  width={44}
                  height={44}
                  priority
                  style={{ objectFit: 'contain', width: 44, height: 44 }}
                />
              </Link>
              <button
                onClick={() => setExpanded(true)}
                className="w-16 h-9 flex items-center justify-center hover:bg-[var(--color-border-soft)] transition-colors rounded-lg"
                aria-label="Abrir menu"
              >
                <Menu size={17} style={{ color: 'var(--color-ink-soft)' }} />
              </button>
            </div>
          )}
        </div>

        {/* ── Nav ── */}
        <nav className="flex-1 py-2 flex flex-col gap-0.5 overflow-hidden">
          {items.map(item => {
            const Icon = item.icon
            const active = isActive(item.href)

            if (expanded) {
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={closeExpanded}
                  className="mx-2 flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all"
                  style={{
                    color: active ? 'var(--color-rose-main)' : 'var(--color-ink-mid)',
                    background: active ? 'var(--color-rose-blush)' : 'transparent',
                    fontWeight: active ? 500 : 400,
                    textDecoration: 'none',
                    whiteSpace: 'nowrap',
                  }}
                  onMouseEnter={e => {
                    if (!active) {
                      const el = e.currentTarget as HTMLElement
                      el.style.background = 'var(--color-border-soft)'
                      el.style.color = 'var(--color-ink)'
                    }
                  }}
                  onMouseLeave={e => {
                    if (!active) {
                      const el = e.currentTarget as HTMLElement
                      el.style.background = 'transparent'
                      el.style.color = 'var(--color-ink-mid)'
                    }
                  }}
                >
                  <Icon size={18} strokeWidth={active ? 2.5 : 1.75} />
                  {item.label}
                </Link>
              )
            }

            /* Collapsed: só ícone + tooltip */
            return (
              <div
                key={item.href}
                onMouseEnter={e => showTooltip(e, item.label)}
                onMouseLeave={() => setTooltip(null)}
              >
                <Link
                  href={item.href}
                  className="w-16 h-11 flex items-center justify-center rounded-xl transition-all duration-150"
                  style={{
                    color: active ? 'var(--color-rose-main)' : 'var(--color-ink-soft)',
                    background: active ? 'var(--color-rose-blush)' : 'transparent',
                  }}
                  onMouseEnter={e => {
                    if (!active) {
                      const el = e.currentTarget as HTMLElement
                      el.style.background = 'var(--color-border-soft)'
                      el.style.color = 'var(--color-ink)'
                    }
                  }}
                  onMouseLeave={e => {
                    if (!active) {
                      const el = e.currentTarget as HTMLElement
                      el.style.background = 'transparent'
                      el.style.color = 'var(--color-ink-soft)'
                    }
                  }}
                >
                  <Icon size={19} strokeWidth={active ? 2.5 : 1.75} />
                </Link>
              </div>
            )
          })}
        </nav>

        {/* ── Bottom: notificações + avatar ── */}
        {expanded ? (
          <div
            className="shrink-0 flex flex-col gap-0.5 py-3 px-3"
            style={{ borderTop: '1px solid var(--color-border-soft)' }}
          >
            <NotificacoesBell expanded />
            <button
              ref={avatarRef}
              onClick={() => {
                if (userMenuPos) { setUserMenuPos(null); return }
                const rect = avatarRef.current?.getBoundingClientRect()
                if (rect) setUserMenuPos({ left: rect.right + 12, bottom: window.innerHeight - rect.bottom })
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-left"
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--color-border-soft)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 overflow-hidden ${fotoUrl ? '' : avatarColors[role]}`}>
                {fotoUrl
                  ? <img src={fotoUrl} alt={nome} className="w-full h-full object-cover" />
                  : initials(nome)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium truncate" style={{ color: 'var(--color-ink)' }}>{nome}</div>
                <div className="text-xs" style={{ color: 'var(--color-ink-soft)' }}>{roleLabel[role]}</div>
              </div>
            </button>
          </div>
        ) : (
          <div
            className="shrink-0 flex flex-col items-center gap-3 py-4"
            style={{ borderTop: '1px solid var(--color-border-soft)' }}
          >
            <NotificacoesBell />
            <button
              ref={avatarRef}
              onClick={() => {
                if (userMenuPos) { setUserMenuPos(null); return }
                const rect = avatarRef.current?.getBoundingClientRect()
                if (rect) setUserMenuPos({ left: rect.right + 12, bottom: window.innerHeight - rect.bottom })
              }}
              className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold transition-opacity hover:opacity-80 overflow-hidden ${fotoUrl ? '' : avatarColors[role]}`}
              title={nome}
            >
              {fotoUrl ? (
                <img src={fotoUrl} alt={nome} className="w-full h-full object-cover" />
              ) : initials(nome)}
            </button>
          </div>
        )}
      </aside>

      {/* ── User menu dropdown — position:fixed escapa overflow:hidden da sidebar ── */}
      {userMenuPos && (
        <>
          <div className="fixed inset-0 z-[9998]" onClick={() => setUserMenuPos(null)} />
          <div
            className="fixed z-[9999] w-56 rounded-2xl py-1"
            style={{
              left: userMenuPos.left,
              bottom: userMenuPos.bottom,
              background: 'var(--color-warm-white)',
              border: '1px solid var(--color-border)',
              boxShadow: '0 8px 32px rgba(44,32,24,0.12)',
            }}
          >
            <Link
              href={profileUrl[role]}
              onClick={() => setUserMenuPos(null)}
              className="block px-4 py-3 rounded-t-2xl transition-colors hover:bg-[var(--color-border-soft)]"
              style={{ borderBottom: '1px solid var(--color-border-soft)', textDecoration: 'none' }}
            >
              <div className="text-sm font-medium truncate" style={{ color: 'var(--color-ink)' }}>{nome}</div>
              <div className="text-xs mt-0.5" style={{ color: 'var(--color-ink-soft)' }}>{roleLabel[role]}</div>
            </Link>

            {role === 'pai' && (
              <Link
                href="/privacidade"
                target="_blank"
                rel="noopener noreferrer"
                className="block px-4 py-2.5 text-sm transition-colors hover:bg-[var(--color-border-soft)]"
                style={{ color: 'var(--color-ink-mid)', textDecoration: 'none' }}
                onClick={() => setUserMenuPos(null)}
              >
                Política de Privacidade
              </Link>
            )}

            <div className="px-4 py-3" style={{ borderTop: '1px solid var(--color-border-soft)', borderBottom: '1px solid var(--color-border-soft)' }}>
              <PushNotificationSettings />
            </div>

            <button
              onClick={handleLogout}
              className="w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 transition-colors hover:bg-[var(--color-border-soft)]"
              style={{ color: 'var(--color-ink-mid)' }}
            >
              <LogOut size={15} />
              Sair da conta
            </button>
          </div>
        </>
      )}

      {/* ── Mobile: top bar ──────────────────────────────────── */}
      <div
        className="lg:hidden fixed top-0 left-0 right-0 h-14 z-40 flex items-center justify-between px-4"
        style={{
          background: 'var(--color-warm-white)',
          borderBottom: '1px solid var(--color-border)',
        }}
      >
        <Link href={dashboardByRole[role]}>
          <Image
            src="/LOGO_H_HIGH.png"
            alt="Alicerce"
            width={140}
            height={40}
            priority
            style={{ objectFit: 'contain', height: 40, width: 'auto' }}
          />
        </Link>
        <div className="flex items-center gap-2">
          <NotificacoesBell />
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 rounded-lg hover:bg-[var(--color-border-soft)] transition-colors"
            aria-label="Abrir menu"
          >
            <Menu size={20} style={{ color: 'var(--color-ink-mid)' }} />
          </button>
        </div>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/30 lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
          <div
            className="fixed top-0 left-0 bottom-0 w-64 z-50 flex flex-col lg:hidden"
            style={{
              background: 'var(--color-warm-white)',
              borderRight: '1px solid var(--color-border)',
            }}
          >
            <div
              className="h-14 flex items-center justify-between px-4 shrink-0"
              style={{ borderBottom: '1px solid var(--color-border)' }}
            >
              <Image src="/LOGO_H_HIGH.png" alt="Alicerce" width={140} height={40} priority style={{ objectFit: 'contain', height: 40, width: 'auto' }} />
              <button
                onClick={() => setMobileOpen(false)}
                className="p-2 rounded-lg hover:bg-[var(--color-border-soft)] transition-colors"
                aria-label="Fechar menu"
              >
                <X size={18} style={{ color: 'var(--color-ink-mid)' }} />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
              {items.map(item => {
                const Icon = item.icon
                const active = isActive(item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all"
                    style={{
                      color: active ? 'var(--color-rose-main)' : 'var(--color-ink-mid)',
                      background: active ? 'var(--color-rose-blush)' : 'transparent',
                      fontWeight: active ? '500' : '400',
                      textDecoration: 'none',
                    }}
                  >
                    <Icon size={18} strokeWidth={active ? 2.5 : 1.75} />
                    {item.label}
                  </Link>
                )
              })}
            </nav>

            <div
              className="shrink-0 px-3 py-4 space-y-3"
              style={{ borderTop: '1px solid var(--color-border)' }}
            >
              <div className="flex items-center gap-3 px-1">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 overflow-hidden ${fotoUrl ? '' : avatarColors[role]}`}>
                  {fotoUrl
                    ? <img src={fotoUrl} alt={nome} className="w-full h-full object-cover" />
                    : initials(nome)}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate" style={{ color: 'var(--color-ink)' }}>{nome}</div>
                  <div className="text-xs" style={{ color: 'var(--color-ink-soft)' }}>{roleLabel[role]}</div>
                </div>
              </div>

              <div className="rounded-xl px-3 py-3" style={{ border: '1px solid var(--color-border-soft)' }}>
                <PushNotificationSettings />
              </div>

              {role === 'pai' && (
                <Link
                  href="/privacidade"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full py-3 rounded-xl text-sm font-medium text-center"
                  style={{ background: 'var(--color-peach-light)', color: 'var(--color-peach-main)', textDecoration: 'none' }}
                >
                  Política de Privacidade
                </Link>
              )}

              <button
                onClick={handleLogout}
                className="w-full py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-colors"
                style={{ background: 'var(--color-rose-blush)', color: 'var(--color-rose-main)' }}
              >
                <LogOut size={15} />
                Sair da conta
              </button>
            </div>
          </div>
        </>
      )}
    </>
  )
}
