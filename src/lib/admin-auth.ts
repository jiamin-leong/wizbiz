import { cookies } from 'next/headers'
import { jwtVerify } from 'jose'
import { redirect } from 'next/navigation'

const secret = new TextEncoder().encode(process.env.JWT_SECRET!)

/**
 * Server actions are addressable independently of the page that renders them,
 * so the middleware guard on /admin is not sufficient on its own. Actions that
 * mint or revoke invites check the admin session themselves.
 */
export async function requireAdmin(): Promise<void> {
  const jar = await cookies()

  const adminToken = jar.get('admin_session')?.value
  if (adminToken) {
    try {
      const { payload } = await jwtVerify(adminToken, secret)
      if (payload.role === 'admin') return
    } catch { /* fall through to the teacher session */ }
  }

  const sessionToken = jar.get('session')?.value
  if (sessionToken) {
    try {
      const { payload } = await jwtVerify(sessionToken, secret)
      if (payload.role === 'teacher' && payload.isAdmin === true) return
    } catch { /* not signed in as an admin teacher */ }
  }

  redirect('/admin/login')
}

/** Whether the current teacher session carries admin rights. */
export async function isAdminTeacher(): Promise<boolean> {
  const token = (await cookies()).get('session')?.value
  if (!token) return false
  try {
    const { payload } = await jwtVerify(token, secret)
    return payload.role === 'teacher' && payload.isAdmin === true
  } catch {
    return false
  }
}

/**
 * The teacher id behind the current admin session, or null when the panel was
 * reached through the standalone admin login. Used to stop an admin deleting
 * or demoting the account they are signed in with.
 */
export async function currentAdminTeacherId(): Promise<number | null> {
  const token = (await cookies()).get('session')?.value
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, secret)
    if (payload.role === 'teacher' && payload.isAdmin === true) return payload.id as number
    return null
  } catch {
    return null
  }
}
