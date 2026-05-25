import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  if (process.env.MAINTENANCE_MODE !== 'true') {
    return NextResponse.next()
  }

  const { pathname } = request.nextUrl

  // Deixa passar: a própria página de manutenção e assets estáticos
  if (
    pathname.startsWith('/manutencao') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/public')
  ) {
    return NextResponse.next()
  }

  const url = request.nextUrl.clone()
  url.pathname = '/manutencao'
  return NextResponse.redirect(url, 307)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
