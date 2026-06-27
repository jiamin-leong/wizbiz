import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

const secret = new TextEncoder().encode(process.env.JWT_SECRET!)

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const token = request.cookies.get('session')?.value

  const isAuth = !!token && await jwtVerify(token, secret).then(() => true).catch(() => false)

  // Admin routes — protected by separate admin_session cookie
  if (pathname.startsWith('/admin')) {
    if (pathname === '/admin/login') return NextResponse.next()
    const adminToken = request.cookies.get('admin_session')?.value
    const isAdmin = !!adminToken && await jwtVerify(adminToken, secret).then(() => true).catch(() => false)
    if (!isAdmin) return NextResponse.redirect(new URL('/admin/login', request.url))
    return NextResponse.next()
  }

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
