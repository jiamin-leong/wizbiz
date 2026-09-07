import { db } from '@/db'
import { competitions, groups, students, programmes, classes } from '@/db/schema'
import { eq, inArray, sql } from 'drizzle-orm'
import Link from 'next/link'
import { competitionStatus } from '@/lib/competition'
import { requireTeacher, visibleCompetitionIds, isAdmin } from '@/lib/authz'

export default async function TeacherDashboard() {
  const session = await requireTeacher()
  // Only admins create programmes and standalone competitions.
  const admin = await isAdmin()

  // Every programme is visible to every approved teacher, so they can find
  // their class and claim it. Opening a class's hackathon is a separate check.
  const programmeRows = await db
    .select({ id: programmes.id, name: programmes.name, ownerTeacherId: programmes.ownerTeacherId })
    .from(programmes)
    .orderBy(programmes.id)

  const programmeIds = programmeRows.map(p => p.id)
  const classRows = programmeIds.length > 0
    ? await db
        .select({ programmeId: classes.programmeId, headcount: classes.headcount, teacherId: classes.teacherId })
        .from(classes)
        .where(inArray(classes.programmeId, programmeIds))
    : []

  const classCountMap = Object.fromEntries(programmeIds.map(id => {
    const rows = classRows.filter(c => c.programmeId === id)
    return [id, {
      count: rows.length,
      students: rows.reduce((n, c) => n + c.headcount, 0),
      mine: rows.filter(c => c.teacherId === session.id).length,
      unclaimed: rows.filter(c => c.teacherId === null).length,
    }]
  }))

  const visibleIds = await visibleCompetitionIds(session.id)

  // Programme competitions live on the programme page; only standalone ones list here.
  const standalone = visibleIds.length > 0
    ? await db
        .select()
        .from(competitions)
        .where(inArray(competitions.id, visibleIds))
        .orderBy(competitions.createdAt)
    : []
  const myCompetitions = standalone.filter(c => c.programmeId === null)

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
      <div className="flex items-center justify-between mb-6 gap-4">
        <h1 className="text-2xl font-bold text-gray-800">Programmes</h1>
        {admin && (
          <Link
            href="/teacher/programmes/new"
            className="text-sm font-medium text-orange border border-ink/15 bg-white hover:border-orange px-3 py-1.5 rounded-lg shadow-sm transition shrink-0"
          >
            + New programme
          </Link>
        )}
      </div>

      {programmeRows.length === 0 ? (
        <div className="bg-white rounded-xl p-8 text-center text-gray-400 shadow-sm mb-10">
          {admin ? (
            <>
              No programmes yet.{' '}
              <Link href="/teacher/programmes/new" className="text-orange hover:underline font-medium">
                Set one up
              </Link>{' '}
              to run several classes through two rounds.
            </>
          ) : (
            <>No programmes have been set up yet.</>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3 mb-10">
          {programmeRows.map(p => (
            <Link
              key={p.id}
              href={`/teacher/programmes/${p.id}`}
              className="bg-white rounded-xl px-6 py-5 shadow-sm hover:shadow-md hover:border-ink/15 border border-transparent transition group"
            >
              <div className="flex justify-between items-start mb-3">
                <p className="text-2xl font-extrabold text-gray-900 group-hover:text-orange transition">{p.name}</p>
                <div className="flex items-center gap-2 shrink-0 ml-4">
                  {(() => {
                    const c = classCountMap[p.id]
                    if (p.ownerTeacherId === session.id) {
                      return <span className="text-xs font-medium px-3 py-1 rounded-full bg-teal/15 text-teal-dark">programme owner</span>
                    }
                    if (c?.mine) {
                      return <span className="text-xs font-medium px-3 py-1 rounded-full bg-teal/15 text-teal-dark">
                        your class{c.mine > 1 ? 'es' : ''}
                      </span>
                    }
                    if (c?.unclaimed) {
                      return <span className="text-xs font-medium px-3 py-1 rounded-full bg-orange/15 text-orange-dark">
                        {c.unclaimed} class{c.unclaimed > 1 ? 'es' : ''} to claim
                      </span>
                    }
                    return <span className="text-xs font-medium px-3 py-1 rounded-full bg-gray-100 text-gray-500">all classes taken</span>
                  })()}
                  <span className="text-gray-300 group-hover:text-orange transition text-2xl font-black">→</span>
                </div>
              </div>
              <div className="flex gap-6">
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Classes</p>
                  <p className="font-display text-2xl font-bold text-orange tabular-nums">{classCountMap[p.id]?.count ?? 0}</p>
                </div>
                <div className="border-l border-gray-100 pl-6">
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Students</p>
                  <p className="font-display text-2xl font-bold text-orange tabular-nums">{classCountMap[p.id]?.students ?? 0}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between mb-6 gap-4">
        <h1 className="text-2xl font-bold text-gray-800">Standalone competitions</h1>
        {admin && (
          <Link
            href="/teacher/competitions/new"
            className="text-sm font-medium text-gray-600 border border-ink/15 bg-white hover:border-ink/30 px-3 py-1.5 rounded-lg shadow-sm transition shrink-0"
          >
            + New standalone competition
          </Link>
        )}
      </div>

      {myCompetitions.length === 0 ? (
        <div className="bg-white rounded-xl p-8 text-center text-gray-400 shadow-sm">
          No standalone competitions.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {myCompetitions.map(c => (
            <Link
              key={c.id}
              href={`/teacher/competitions/${c.id}`}
              className="bg-white rounded-xl px-6 py-5 shadow-sm hover:shadow-md hover:border-ink/15 border border-transparent transition cursor-pointer group"
            >
              <div className="flex justify-between items-start mb-3">
                <p className="text-2xl font-extrabold text-gray-900 group-hover:text-orange transition">{c.name}</p>
                <div className="flex items-center gap-2 shrink-0 ml-4">
                  {(() => {
                    const status = competitionStatus(c.startDate, c.endDate)
                    const styles = {
                      upcoming: 'bg-teal/15 text-teal-dark',
                      active: 'bg-green-100 text-green-700',
                      ended: 'bg-gray-100 text-gray-500',
                    }[status]
                    return (
                      <span className={`text-xs font-medium px-3 py-1 rounded-full ${styles}`}>
                        {status}
                      </span>
                    )
                  })()}
                  <span className="text-gray-300 group-hover:text-orange transition text-2xl font-black">→</span>
                </div>
              </div>
              <div className="flex gap-6">
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Duration</p>
                  <p className="text-base font-semibold text-gray-700">
                    {new Date(c.startDate).toLocaleDateString()} → {new Date(c.endDate).toLocaleDateString()}
                  </p>
                  <p className="text-sm text-orange">{duration(new Date(c.startDate), new Date(c.endDate))}</p>
                </div>
                <div className="border-l border-gray-100 pl-6">
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Teams</p>
                  <p className="font-display text-2xl font-bold text-orange tabular-nums">{groupCountMap[c.id] ?? 0}</p>
                </div>
                <div className="border-l border-gray-100 pl-6">
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Students</p>
                  <p className="font-display text-2xl font-bold text-orange tabular-nums">{studentCountMap[c.id] ?? 0}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
