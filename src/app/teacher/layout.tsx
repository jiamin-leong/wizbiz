import { getSession } from '@/lib/auth'
import { logout } from '@/lib/actions'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { db } from '@/db'
import { teachers } from '@/db/schema'
import { eq } from 'drizzle-orm'

export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session || session.role !== 'teacher') redirect('/')

  const [teacher] = await db.select({ name: teachers.name, email: teachers.email })
    .from(teachers)
    .where(eq(teachers.id, session.id))

  return (
    <div className="min-h-screen bg-amber-50 flex">
      {/* Sidebar */}
      <aside className="w-60 bg-white border-r border-amber-100 flex flex-col shrink-0">
        <div className="px-6 py-5 border-b border-amber-100">
          <span className="text-xl font-bold text-amber-600">WizBiz</span>
          <p className="text-xs text-gray-400 mt-0.5">Teacher Portal</p>
        </div>

        <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-3 mb-1">Competitions</p>
          <Link
            href="/teacher"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-amber-50 hover:text-amber-700 transition"
          >
            <span>📋</span> All Competitions
          </Link>
          <Link
            href="/teacher/competitions/new"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-amber-50 hover:text-amber-700 transition"
          >
            <span>➕</span> New Competition
          </Link>
        </nav>

        {/* Profile + Logout */}
        <div className="px-3 py-4 border-t border-amber-100">
          <div className="px-3 py-2 mb-1">
            <p className="text-sm font-medium text-gray-700">{teacher?.name}</p>
            <p className="text-xs text-gray-400 truncate">{teacher?.email}</p>
          </div>
          <form action={logout}>
            <button className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-500 hover:bg-red-50 hover:text-red-600 transition text-left">
              <span>🚪</span> Logout
            </button>
          </form>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-8 overflow-auto">
        {children}
      </main>
    </div>
  )
}
