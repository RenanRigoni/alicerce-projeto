import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

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

  const { data: { user } } = await supabase.auth.getUser()
  const pathname = request.nextUrl.pathname

  // Rotas públicas — sempre acessíveis
  const publicRoutes = ['/login', '/recuperar-senha']
  if (publicRoutes.includes(pathname)) {
    // Se já está logado, redireciona para o dashboard correto
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      const role = profile?.role
      if (role === 'pai')                       return NextResponse.redirect(new URL('/portal/dashboard', request.url))
      if (role === 'terapeuta')                 return NextResponse.redirect(new URL('/terapia/dashboard', request.url))
      if (role === 'admin' || role === 'recepcao') return NextResponse.redirect(new URL('/admin/dashboard', request.url))
    }
    return supabaseResponse
  }

  // Usuário não autenticado → login
  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Busca role do usuário
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const role = profile?.role

  // Proteção por rota
  if (pathname.startsWith('/portal') && role !== 'pai') {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  if (pathname.startsWith('/terapia') && role !== 'terapeuta') {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  if (pathname.startsWith('/admin') && role !== 'admin' && role !== 'recepcao') {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
