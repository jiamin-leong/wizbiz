import { adminLogout } from '@/lib/admin-actions'
import InvitePanel from './InvitePanel'
import { listInvites } from '@/lib/invite-actions'
import { listTeachers } from '@/lib/teacher-admin-actions'
import TeacherAccounts from './TeacherAccounts'
import { headers } from 'next/headers'
import Link from 'next/link'
import { isAdminTeacher } from '@/lib/admin-auth'

export default async function AdminPage() {
  const viaTeacherPortal = await isAdminTeacher()
  const invites = await listInvites()
  const host = (await headers()).get('host') ?? 'localhost:3000'
  const origin = `${host.startsWith('localhost') || host.startsWith('127.') ? 'http' : 'https'}://${host}`

  const allTeachers = await listTeachers()

  return (
    <div className="min-h-screen bg-paper-2">
      <header className="bg-orange text-white px-8 py-4 flex justify-between items-center">
        <div>
          <span className="text-xl font-extrabold">WizBiz</span>
          <span className="ml-2 text-paper text-sm font-medium uppercase tracking-widest">Admin</span>
        </div>
        {viaTeacherPortal ? (
          <Link
            href="/teacher"
            className="text-sm bg-white text-orange hover:bg-paper-2 font-semibold px-3 py-1.5 rounded-lg transition"
          >
            ← Back to portal
          </Link>
        ) : (
          <form action={adminLogout}>
            <button className="text-sm bg-white text-orange hover:bg-paper-2 font-semibold px-3 py-1.5 rounded-lg transition">
              Logout
            </button>
          </form>
        )}
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10 flex flex-col gap-8">
        <InvitePanel invites={invites} origin={origin} />

        <TeacherAccounts teachers={allTeachers} />
      </main>
    </div>
  )
}
