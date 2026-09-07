import { db } from '@/db'
import { programmes, classes, competitions, groups, students, teachers } from '@/db/schema'
import { eq, and, inArray, sql } from 'drizzle-orm'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { requireTeacher, getProgrammeAccess } from '@/lib/authz'
import { allocateGroups } from '@/lib/allocation'
import { ADVANCING_PER_CLASS } from '@/lib/standings'
import { listAssignableTeachers } from '@/lib/programme-actions'
import { competitionStatus } from '@/lib/competition'
import LaunchRound1Form from './LaunchRound1Form'
import CreateFinalForm from './CreateFinalForm'
import ClassTeacherField from './ClassTeacherField'

export default async function ProgrammePage({ params }: { params: Promise<{ id: string }> }) {
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

  // Every approved teacher sees every class, so they can find and claim
  // theirs. Opening a class's hackathon is checked separately.
  const visibleClasses = allClasses

  const programmeCompetitions = await db
    .select()
    .from(competitions)
    .where(eq(competitions.programmeId, programmeId))

  const round1 = programmeCompetitions.filter(c => c.round === 1)
  const round2 = programmeCompetitions.find(c => c.round === 2) ?? null
  const round1Ids = round1.map(c => c.id)

  const [qualifiedCounts, teamCounts, teacherRows, finalTeamCount] = await Promise.all([
    round1Ids.length > 0
      ? db.select({ competitionId: groups.competitionId, count: sql<number>`count(*)::int` })
          .from(groups)
          .where(and(inArray(groups.competitionId, round1Ids), eq(groups.qualified, true)))
          .groupBy(groups.competitionId)
      : Promise.resolve([]),
    round1Ids.length > 0
      ? db.select({ competitionId: groups.competitionId, count: sql<number>`count(*)::int` })
          .from(groups)
          .where(inArray(groups.competitionId, round1Ids))
          .groupBy(groups.competitionId)
      : Promise.resolve([]),
    listAssignableTeachers(),
    round2
      ? db.select({ count: sql<number>`count(*)::int` })
          .from(groups)
          .where(and(eq(groups.competitionId, round2.id), eq(groups.kind, 'team')))
      : Promise.resolve([{ count: 0 }]),
  ])

  const qualifiedMap = Object.fromEntries(qualifiedCounts.map(r => [r.competitionId, r.count]))
  const teamCountMap = Object.fromEntries(teamCounts.map(r => [r.competitionId, r.count]))
  const teacherMap = Object.fromEntries(teacherRows.map(t => [t.id, t]))
  const compByClass = Object.fromEntries(round1.map(c => [c.classId!, c]))

  const judgeCount = round2
    ? (await db
        .select({ count: sql<number>`count(students.id)::int` })
        .from(groups)
        .leftJoin(students, eq(students.groupId, groups.id))
        .where(and(eq(groups.competitionId, round2.id), eq(groups.kind, 'judges'))))[0]?.count ?? 0
    : 0

  // Students in teams that qualified — everyone else can come as a spectator.
  const finalistStudentCount = round1Ids.length > 0
    ? (await db
        .select({ count: sql<number>`count(students.id)::int` })
        .from(groups)
        .leftJoin(students, eq(students.groupId, groups.id))
        .where(and(inArray(groups.competitionId, round1Ids), eq(groups.qualified, true))))[0]?.count ?? 0
    : 0

  const launched = round1.length > 0
  const classesConfirmed = round1.filter(c => (qualifiedMap[c.id] ?? 0) > 0).length
  const allConfirmed = launched && classesConfirmed === round1.length
  const totalStudents = allClasses.reduce((s, c) => s + c.headcount, 0)
  const totalTeams = allClasses.reduce((s, c) => s + allocateGroups(c.headcount).length, 0)

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <Link href="/teacher" className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 hover:border-ink/15 hover:text-orange px-3 py-1.5 rounded-lg shadow-sm transition">
          ← Back
        </Link>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
        <div className="flex items-start justify-between gap-4 mb-5">
          <h1 className="text-3xl font-extrabold text-gray-900">{programme.name}</h1>
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-teal/15 text-teal-dark shrink-0">
            {access.isOwner ? 'programme owner' : 'class teacher'}
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Stat label="Classes" value={allClasses.length} />
          <Stat label="Students" value={totalStudents} />
          <Stat label="Total teams" value={launched ? Object.values(teamCountMap).reduce((a, b) => a + b, 0) : totalTeams} />
          <Stat label="Finalist teams" value={allClasses.length * ADVANCING_PER_CLASS} />
        </div>
      </div>

      {/* ── Round 1 ── */}
      <div className="flex items-baseline gap-3 mb-3">
        <h2 className="text-lg font-semibold text-gray-700">Round 1 — class hackathons</h2>
        {launched && (
          <span className="text-sm text-gray-400">
            {classesConfirmed}/{round1.length} classes confirmed
          </span>
        )}
      </div>

      {!launched && access.isOwner && (
        <LaunchRound1Form
          programmeId={programmeId}
          classCount={allClasses.length}
          teamCount={totalTeams}
          studentCount={totalStudents}
          settings={{
            startDate: programme.startDate,
            endDate: programme.endDate,
            groupCapital: programme.groupCapital,
            personalStartingBalance: programme.personalStartingBalance,
          }}
        />
      )}
      {!launched && !access.isOwner && (
        <div className="bg-white rounded-xl p-6 text-sm text-gray-400 shadow-sm mb-6">
          Round 1 has not been launched yet. The programme owner starts it for every class at once.
        </div>
      )}

      {launched && (
        <div className="flex flex-col gap-2 mb-8">
          {visibleClasses.map(klass => {
            const comp = compByClass[klass.id]
            const qualified = comp ? (qualifiedMap[comp.id] ?? 0) : 0
            const teamCount = comp ? (teamCountMap[comp.id] ?? 0) : 0
            const status = comp ? competitionStatus(comp.startDate, comp.endDate) : null
            const teacher = klass.teacherId ? teacherMap[klass.teacherId] : null

            return (
              <div key={klass.id} className="bg-white rounded-xl shadow-sm border border-gray-100 px-5 py-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-lg font-bold text-gray-900">{klass.name}</p>
                      {status && (
                        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                          status === 'active' ? 'bg-green-100 text-green-700'
                          : status === 'upcoming' ? 'bg-teal/15 text-teal-dark'
                          : 'bg-gray-100 text-gray-500'
                        }`}>{status}</span>
                      )}
                      {qualified > 0 && (
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-orange/15 text-orange-dark">
                          top {qualified} confirmed
                        </span>
                      )}
                      {klass.teacherId === session.id && (
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-teal text-white">
                          yours
                        </span>
                      )}
                      {klass.teacherId === null && (
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full border border-orange/40 text-orange-dark">
                          unclaimed
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      {klass.headcount} students · {teamCount} teams
                      {teacher ? ` · ${teacher.name}` : ' · no class teacher'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <ClassTeacherField
                      classId={klass.id}
                      currentTeacherId={klass.teacherId}
                      teachers={teacherRows}
                    />
                    {comp && (
                      <Link
                        href={`/teacher/competitions/${comp.id}`}
                        className="text-sm font-medium text-orange border border-ink/15 bg-white hover:border-orange px-3 py-1.5 rounded-lg transition"
                      >
                        Open →
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Round 2 ── */}
      <h2 className="text-lg font-semibold text-gray-700 mb-3">Round 2 — the final</h2>

      {round2 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-lg font-bold text-gray-900">{round2.name}</p>
              <p className="text-xs text-gray-400 mt-1">
                {finalTeamCount[0]?.count ?? 0} finalist teams
                {judgeCount > 0 && ` · ${judgeCount} judges`}
                {' · '}
                {new Date(round2.startDate).toLocaleDateString()} → {new Date(round2.endDate).toLocaleDateString()}
              </p>
            </div>
            <Link
              href={`/teacher/competitions/${round2.id}`}
              className="text-sm font-medium text-orange border border-ink/15 bg-white hover:border-orange px-3 py-1.5 rounded-lg transition"
            >
              Open →
            </Link>
          </div>
        </div>
      ) : !access.isOwner ? (
        <div className="bg-white rounded-xl p-6 text-sm text-gray-400 shadow-sm">
          The programme owner creates the final once every class has confirmed its top {ADVANCING_PER_CLASS}.
        </div>
      ) : !launched ? (
        <div className="bg-white rounded-xl p-6 text-sm text-gray-400 shadow-sm">
          Launch round 1 first.
        </div>
      ) : !allConfirmed ? (
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <p className="text-sm text-gray-600 mb-2">
            Waiting on {round1.length - classesConfirmed} of {round1.length} classes to confirm their top {ADVANCING_PER_CLASS}.
          </p>
          <p className="text-xs text-gray-400">
            Each class confirms from the Standings tab on its own hackathon page.
          </p>
        </div>
      ) : (
        <CreateFinalForm
          programmeId={programmeId}
          finalistCount={round1.length * ADVANCING_PER_CLASS}
          spectatorCount={totalStudents - finalistStudentCount}
        />
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-paper-2 rounded-xl p-4">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">{label}</p>
      <p className="font-display text-3xl font-bold text-orange tabular-nums">{value}</p>
    </div>
  )
}
