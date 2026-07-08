import { getSession } from '@/lib/auth'
import { logout } from '@/lib/actions'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { db } from '@/db'
import { teachers, competitions, competitionOrganizers } from '@/db/schema'
import { eq, desc } from 'drizzle-orm'
import { competitionStatus } from '@/lib/competition'

export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session || session.role !== 'teacher') redirect('/')

  const [teacher, ownedComps, coOrgComps] = await Promise.all([
    db.select({ name: teachers.name, email: teachers.email })
      .from(teachers)
      .where(eq(teachers.id, session.id))
      .then(r => r[0]),
    db.select({ id: competitions.id, name: competitions.name, startDate: competitions.startDate, endDate: competitions.endDate })
      .from(competitions)
      .where(eq(competitions.teacherId, session.id))
      .orderBy(desc(competitions.createdAt)),
    db.select({ id: competitions.id, name: competitions.name, startDate: competitions.startDate, endDate: competitions.endDate })
      .from(competitionOrganizers)
      .innerJoin(competitions, eq(competitions.id, competitionOrganizers.competitionId))
      .where(eq(competitionOrganizers.teacherId, session.id))
      .orderBy(desc(competitions.createdAt)),
  ])

  const seen = new Set<number>()
  const allCompetitions = [...ownedComps, ...coOrgComps].filter(c => {
    if (seen.has(c.id)) return false
    seen.add(c.id)
    return true
  })

  const upcoming = allCompetitions.filter(c => competitionStatus(c.startDate, c.endDate) === 'upcoming')
  const active = allCompetitions.filter(c => competitionStatus(c.startDate, c.endDate) === 'active')
  const past = allCompetitions.filter(c => competitionStatus(c.startDate, c.endDate) === 'ended')

  return (
    <div className="min-h-screen bg-paper-2 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-ink/10 flex flex-col shrink-0">
        <div className="px-6 py-6 border-b border-ink/10 bg-ink">
          <span className="chrome-text-dark text-2xl" style={{ fontWeight: 700 }}>WizBiz</span>
          <p className="text-[10px] font-semibold text-paper/70 uppercase tracking-widest mt-1 font-pixel">Teacher Portal</p>
        </div>

        <nav className="flex-1 px-3 py-4 flex flex-col gap-4 overflow-y-auto">
          {/* Upcoming competitions */}
          {upcoming.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-3 mb-1">Upcoming</p>
              <div className="flex flex-col gap-0.5">
                {upcoming.map(c => (
                  <Link
                    key={c.id}
                    href={`/teacher/competitions/${c.id}`}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-paper-2 hover:text-teal-dark transition truncate"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-teal shrink-0" />
                    <span className="truncate">{c.name}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

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
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-paper-2 hover:text-orange-dark transition truncate"
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
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-orange hover:bg-paper-2 transition font-medium border border-dashed border-ink/15 hover:border-orange"
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
      <main className="grid-bg flex-1 p-8 overflow-auto">
        {children}
      </main>
    </div>
  )
}
