import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

const secret = new TextEncoder().encode(process.env.JWT_SECRET!)

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const token = request.cookies.get('session')?.value

  const isAuth = !!token && await jwtVerify(token, secret).then(() => true).catch(() => false)

  // Admin routes. Reachable either with the standalone admin_session, or by a
  // signed-in teacher flagged as an admin — so the panel is a link inside the
  // teacher portal rather than a URL to remember.
  if (pathname.startsWith('/admin')) {
    if (pathname === '/admin/login') return NextResponse.next()

    const adminToken = request.cookies.get('admin_session')?.value
    const hasAdminSession = !!adminToken
      && await jwtVerify(adminToken, secret).then(() => true).catch(() => false)
    if (hasAdminSession) return NextResponse.next()

    if (isAuth) {
      const { payload } = await jwtVerify(token!, secret)
      if (payload.role === 'teacher' && payload.isAdmin === true) return NextResponse.next()
      // A signed-in teacher without admin rights is sent back to their portal,
      // not to a login form they have no way to satisfy.
      return NextResponse.redirect(new URL('/teacher', request.url))
    }

    return NextResponse.redirect(new URL('/admin/login', request.url))
  }

  // Sign-up is gated by an invite code rather than a session, and stays
  // reachable even when signed in — otherwise clicking an invite link while
  // logged in silently bounces you to your own portal.
  if (pathname.startsWith('/signup')) return NextResponse.next()

  // Public routes
  if (pathname === '/' || pathname.startsWith('/login')) {
    if (isAuth) {
      const { payload } = await jwtVerify(token!, secret)
      return NextResponse.redirect(new URL(
        payload.role === 'teacher' ? '/teacher' : '/student',
        request.url
      ))
    }
    return NextResponse.next()
  }

  if (!isAuth) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // Role-based route protection
  const { payload } = await jwtVerify(token!, secret)
  if (pathname.startsWith('/teacher') && payload.role !== 'teacher') {
    return NextResponse.redirect(new URL('/student', request.url))
  }
  if (pathname.startsWith('/student') && payload.role !== 'student') {
    return NextResponse.redirect(new URL('/teacher', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
