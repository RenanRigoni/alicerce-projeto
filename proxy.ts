import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { jwtDecode } from 'jwt-decode'

function getRoleFromCookies(request: NextRequest): string | null {
  // Decode role from Supabase JWT locally — no network call
  try {
    const cookieName = Object.keys(Object.fromEntries(
      request.cookies.getAll().map(c => [c.name, c.value])
    )).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'))

    if (!cookieName) return null
    const raw = request.cookies.get(cookieName)?.value
    if (!raw) return null

    const parsed = JSON.parse(raw)
    const token = Array.isArray(parsed) ? parsed[0] : parsed?.access_token
    if (!token) return null

    const payload = jwtDecode<{ user_role?: string; role?: string; app_metadata?: { role?: string } }>(token)
    return (payload as any).user_role ?? payload.app_metadata?.role ?? null
  } catch {
    return null
  }
}

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // getSession = local JWT decode, sem chamada de rede (rápido)
  const { data: { session } } = await supabase.auth.getSession()
  const pathname = request.nextUrl.pathname

  // Rotas públicas — sempre acessíveis
  const publicRoutes = ['/login', '/recuperar-senha']
  if (publicRoutes.includes(pathname)) {
    // Se já está logado, redireciona para o dashboard correto
    if (session) {
      const role = getRoleFromCookies(request)
      if (role === 'pai')                          return NextResponse.redirect(new URL('/portal/dashboard', request.url))
      if (role === 'terapeuta')                    return NextResponse.redirect(new URL('/terapia/dashboard', request.url))
      if (role === 'admin' || role === 'recepcao') return NextResponse.redirect(new URL('/admin/dashboard', request.url))
    }
    return supabaseResponse
  }

  // Usuário não autenticado → login
  if (!session) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const role = getRoleFromCookies(request)

  // Proteção por rota (se role não decodificável, deixa layout decidir)
  if (role) {
    if (pathname.startsWith('/portal') && role !== 'pai') {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    if (pathname.startsWith('/terapia') && role !== 'terapeuta') {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    if (pathname.startsWith('/admin') && role !== 'admin' && role !== 'recepcao') {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
