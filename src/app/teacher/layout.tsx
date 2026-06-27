import { getSession } from '@/lib/auth'
import { logout } from '@/lib/actions'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { db } from '@/db'
import { teachers, competitions } from '@/db/schema'
import { eq, desc } from 'drizzle-orm'

export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session || session.role !== 'teacher') redirect('/')

  const [teacher, allCompetitions] = await Promise.all([
    db.select({ name: teachers.name, email: teachers.email })
      .from(teachers)
      .where(eq(teachers.id, session.id))
      .then(r => r[0]),
    db.select({ id: competitions.id, name: competitions.name, status: competitions.status })
      .from(competitions)
      .where(eq(competitions.teacherId, session.id))
      .orderBy(desc(competitions.createdAt)),
  ])

  const active = allCompetitions.filter(c => c.status === 'active')
  const past = allCompetitions.filter(c => c.status === 'ended')

  return (
    <div className="min-h-screen bg-amber-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-amber-100 flex flex-col shrink-0">
        <div className="px-6 py-6 border-b border-amber-100 bg-amber-500">
          <span className="text-2xl font-extrabold text-white tracking-tight">WizBiz</span>
          <p className="text-xs font-semibold text-amber-100 uppercase tracking-widest mt-0.5">Teacher Portal</p>
        </div>

        <nav className="flex-1 px-3 py-4 flex flex-col gap-4 overflow-y-auto">
          {/* Active competitions */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-3 mb-1">Active</p>
            {active.length === 0 ? (
              <p className="text-xs text-gray-400 px-3 py-1">No active competitions</p>
            ) : (
              <div className="flex flex-col gap-0.5">
                {active.map(c => (
                  <Link
                    key={c.id}
                    href={`/teacher/competitions/${c.id}`}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-amber-50 hover:text-amber-700 transition truncate"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />
                    <span className="truncate">{c.name}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Past competitions */}
          {past.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-3 mb-1">Past</p>
              <div className="flex flex-col gap-0.5">
                {past.map(c => (
                  <Link
                    key={c.id}
                    href={`/teacher/competitions/${c.id}`}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition truncate"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-300 shrink-0" />
                    <span className="truncate">{c.name}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* New competition */}
          <Link
            href="/teacher/competitions/new"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-amber-600 hover:bg-amber-50 transition font-medium border border-dashed border-amber-300 hover:border-amber-400"
          >
            <span>＋</span> New Competition
          </Link>

          {/* Divider */}
          <div className="border-t border-gray-100" />

          {/* Profile + Logout */}
          <div className="flex flex-col gap-1">
            <div className="px-3 py-2">
              <p className="text-sm font-semibold text-gray-700">{teacher?.name}</p>
              <p className="text-xs text-gray-400 truncate">{teacher?.email}</p>
            </div>
            <form action={logout}>
              <button className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-500 hover:bg-red-50 hover:text-red-600 transition text-left">
                <span>🚪</span> Logout
              </button>
            </form>
          </div>
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-8 overflow-auto">
        {children}
      </main>
    </div>
  )
}
