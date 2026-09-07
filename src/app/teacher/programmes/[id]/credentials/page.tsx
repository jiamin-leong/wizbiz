import { db } from '@/db'
import { programmes, classes, competitions, groups, students } from '@/db/schema'
import { eq, and, inArray } from 'drizzle-orm'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { requireTeacher, getProgrammeAccess } from '@/lib/authz'
import PrintButton from './PrintButton'

export default async function CredentialsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const programmeId = parseInt(id)
  const session = await requireTeacher()

  const access = await getProgrammeAccess(programmeId, session.id)
  if (!access) redirect('/teacher')

  const [programme] = await db.select().from(programmes).where(eq(programmes.id, programmeId))
  if (!programme) redirect('/teacher')

  const allClasses = await db
    .select()
    .from(classes)
    .where(eq(classes.programmeId, programmeId))
    .orderBy(classes.id)

  // The owner prints the whole programme; a class teacher prints their own.
  const visible = access.isOwner ? allClasses : allClasses.filter(c => access.ownClassIds.includes(c.id))

  const comps = await db
    .select({ id: competitions.id, classId: competitions.classId })
    .from(competitions)
    .where(and(eq(competitions.programmeId, programmeId), eq(competitions.round, 1)))

  const compIds = comps.map(c => c.id)
  const allGroups = compIds.length
    ? await db.select({
        id: groups.id, competitionId: groups.competitionId, name: groups.name,
        password: groups.groupPassword, kind: groups.kind,
      }).from(groups).where(inArray(groups.competitionId, compIds))
    : []

  const allStudents = allGroups.length
    ? await db.select({ id: students.id, groupId: students.groupId, loginCode: students.loginCode })
        .from(students).where(inArray(students.groupId, allGroups.map(g => g.id)))
        .orderBy(students.loginCode)
    : []

  const sections = visible.map(klass => {
    const comp = comps.find(c => c.classId === klass.id)
    const teams = allGroups
      .filter(g => g.competitionId === comp?.id && g.kind === 'team')
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(g => ({
        ...g,
        members: allStudents.filter(s => s.groupId === g.id),
      }))
    return { klass, teams, launched: !!comp }
  })

  const totalStudents = sections.reduce((n, s) => n + s.teams.reduce((m, t) => m + t.members.length, 0), 0)

  return (
    <div className="print-area">
      <div className="print-hide mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link
          href={`/teacher/programmes/${programmeId}`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 hover:border-ink/15 hover:text-orange px-3 py-1.5 rounded-lg shadow-sm transition"
        >
          ← Back
        </Link>
        <PrintButton />
      </div>

      <div className="print-hide mb-6 rounded-xl border-2 border-orange/30 bg-orange/[0.06] px-4 py-3 text-sm text-ink-soft">
        <span className="font-semibold text-orange-dark">Handle with care. </span>
        This page shows every login code and password in plain text — {totalStudents} of them. Print
        it, cut along the lines, and hand each student their own slip rather than passing the sheet
        around.
      </div>

      <header className="mb-6">
        <h1 className="text-2xl font-extrabold text-gray-900">{programme.name}</h1>
        <p className="text-sm text-gray-500">
          Student logins · {sections.length} {sections.length === 1 ? 'class' : 'classes'} · {totalStudents} students
        </p>
        <p className="text-xs text-gray-500 mt-1">
          Everyone on a team shares the same password; the login code is what identifies each student.
        </p>
      </header>

      {sections.map(({ klass, teams, launched }) => (
        <section key={klass.id} className="mb-8 break-after-page last:break-after-auto">
          <h2 className="text-lg font-bold text-gray-900 border-b-2 border-ink pb-1 mb-3">
            {klass.name}
            <span className="ml-2 text-sm font-normal text-gray-500">
              {teams.reduce((n, t) => n + t.members.length, 0)} students · {teams.length} teams
            </span>
          </h2>

          {!launched && <p className="text-sm text-gray-400">Round 1 has not been launched for this class yet.</p>}

          <div className="grid gap-3 sm:grid-cols-2">
            {teams.map(team => (
              <div key={team.id} className="border border-ink/20 rounded-lg break-inside-avoid">
                <div className="flex items-baseline justify-between gap-2 px-3 py-2 border-b border-ink/15 bg-paper-2">
                  <span className="font-bold text-gray-900">{team.name}</span>
                  <span className="text-xs text-gray-500">{team.members.length} students</span>
                </div>
                <ul>
                  {team.members.map(m => (
                    <li
                      key={m.id}
                      className="px-3 py-2 border-b border-dashed border-ink/25 last:border-0"
                    >
                      {/* Labelled on every line: a slip gets cut out on its own,
                          so it has to make sense with no header above it. */}
                      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm">
                        <span className="flex items-baseline gap-1.5">
                          <span className="text-[10px] uppercase tracking-wide text-gray-500 w-16 shrink-0">Login code</span>
                          <span className="font-pixel tracking-wide text-gray-900 font-bold">{m.loginCode}</span>
                        </span>
                        <span className="flex items-baseline gap-1.5">
                          <span className="text-[10px] uppercase tracking-wide text-gray-500 w-16 shrink-0">Password</span>
                          <span className="font-pixel tracking-wide text-gray-900 font-bold">{team.password}</span>
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      ))}

      {sections.length === 0 && (
        <p className="text-sm text-gray-400">You do not teach any class in this programme yet.</p>
      )}
    </div>
  )
}
