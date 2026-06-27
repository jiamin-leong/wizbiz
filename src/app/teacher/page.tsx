import { getSession } from '@/lib/auth'
import { db } from '@/db'
import { competitions, groups, students } from '@/db/schema'
import { eq, inArray, sql } from 'drizzle-orm'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function TeacherDashboard() {
  const session = await getSession()
  if (!session || session.role !== 'teacher') redirect('/')

  const myCompetitions = await db
    .select()
    .from(competitions)
    .where(eq(competitions.teacherId, session.id))
    .orderBy(competitions.createdAt)

  const competitionIds = myCompetitions.map(c => c.id)

  const [groupCounts, studentCounts] = competitionIds.length > 0 ? await Promise.all([
    db.select({ competitionId: groups.competitionId, count: sql<number>`count(*)::int` })
      .from(groups)
      .where(inArray(groups.competitionId, competitionIds))
      .groupBy(groups.competitionId),
    db.select({ competitionId: groups.competitionId, count: sql<number>`count(students.id)::int` })
      .from(groups)
      .leftJoin(students, eq(students.groupId, groups.id))
      .where(inArray(groups.competitionId, competitionIds))
      .groupBy(groups.competitionId),
  ]) : [[], []]

  const groupCountMap = Object.fromEntries(groupCounts.map(r => [r.competitionId, r.count]))
  const studentCountMap = Object.fromEntries(studentCounts.map(r => [r.competitionId, r.count]))

  function duration(start: Date, end: Date) {
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
    return days === 1 ? '1 day' : `${days} days`
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Your Competitions</h1>

      {myCompetitions.length === 0 ? (
        <div className="bg-white rounded-xl p-8 text-center text-gray-400 shadow-sm">
          No competitions yet.{' '}
          <Link href="/teacher/competitions/new" className="text-amber-500 hover:underline font-medium">
            Create your first one
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {myCompetitions.map(c => (
            <Link
              key={c.id}
              href={`/teacher/competitions/${c.id}`}
              className="bg-white rounded-xl px-6 py-5 shadow-sm hover:shadow-md hover:border-amber-300 border border-transparent transition cursor-pointer group"
            >
              <div className="flex justify-between items-start mb-3">
                <p className="text-2xl font-extrabold text-gray-900 group-hover:text-amber-600 transition">{c.name}</p>
                <div className="flex items-center gap-2 shrink-0 ml-4">
                  <span className={`text-xs font-medium px-3 py-1 rounded-full ${
                    c.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {c.status}
                  </span>
                  <span className="text-gray-300 group-hover:text-amber-400 transition text-2xl font-black">→</span>
                </div>
              </div>
              <div className="flex gap-6">
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Duration</p>
                  <p className="text-base font-semibold text-gray-700">
                    {new Date(c.startDate).toLocaleDateString()} → {new Date(c.endDate).toLocaleDateString()}
                  </p>
                  <p className="text-sm text-amber-500">{duration(new Date(c.startDate), new Date(c.endDate))}</p>
                </div>
                <div className="border-l border-gray-100 pl-6">
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Groups</p>
                  <p className="text-2xl font-bold text-amber-600">{groupCountMap[c.id] ?? 0}</p>
                </div>
                <div className="border-l border-gray-100 pl-6">
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Students</p>
                  <p className="text-2xl font-bold text-amber-600">{studentCountMap[c.id] ?? 0}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
