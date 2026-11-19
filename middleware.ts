import { NextResponse, type NextRequest } from 'next/server'
import { readSession, SESSION_COOKIE } from './lib/session'

const PUBLIC = ['/login']

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname
  if (PUBLIC.some((p) => path.startsWith(p))) return NextResponse.next()

  const uid = await readSession(request.cookies.get(SESSION_COOKIE)?.value)
  if (!uid) {
    if (path.startsWith('/api/')) return NextResponse.json({ error: 'não autenticado' }, { status: 401 })
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.search = ''
    return NextResponse.redirect(url)
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.svg|manifest.webmanifest|.*\\.(?:png|svg|jpg|webp|mjs)$).*)'],
}
