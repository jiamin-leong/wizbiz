import { db } from '@/db'
import { competitions, groups, students, competitionOrganizers, teachers, transfers, classes } from '@/db/schema'
import { eq, inArray, or } from 'drizzle-orm'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import CompetitionTabs from './CompetitionTabs'
import CompetitionHeader from './CompetitionHeader'
import AutoRefresh from './AutoRefresh'
import { requireTeacher, getCompetitionAccess, roleLabel } from '@/lib/authz'
import { computeStatements, rankStatements } from '@/lib/standings'

export default async function CompetitionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await requireTeacher()

  const [competition] = await db
    .select()
    .from(competitions)
    .where(eq(competitions.id, parseInt(id)))

  if (!competition) redirect('/teacher')

  const access = await getCompetitionAccess(competition.id, session.id)
  if (!access) redirect('/teacher')

  const competitionGroups = await db
    .select()
    .from(groups)
    .where(eq(groups.competitionId, competition.id))
    .orderBy(groups.id)

  const groupIds = competitionGroups.map(g => g.id)

  const [allStudents, coOrgRows, allTransfers, classRow] = await Promise.all([
    groupIds.length
      ? db.select({ id: students.id, loginCode: students.loginCode, groupId: students.groupId, personalBalance: students.personalBalance })
          .from(students)
          .where(inArray(students.groupId, groupIds))
          .orderBy(students.loginCode)
      : Promise.resolve([]),
    db.select({ id: teachers.id, name: teachers.name, email: teachers.email })
      .from(competitionOrganizers)
      .innerJoin(teachers, eq(teachers.id, competitionOrganizers.teacherId))
      .where(eq(competitionOrganizers.competitionId, competition.id)),
    groupIds.length
      ? db.select({ fromGroupId: transfers.fromGroupId, toGroupId: transfers.toGroupId, toStore: transfers.toStore, fromPersonal: transfers.fromPersonal, amount: transfers.amount })
          .from(transfers)
          .where(or(inArray(transfers.fromGroupId, groupIds), inArray(transfers.toGroupId, groupIds)))
      : Promise.resolve([]),
    competition.classId
      ? db.select({ name: classes.name }).from(classes).where(eq(classes.id, competition.classId)).then(r => r[0] ?? null)
      : Promise.resolve(null),
  ])

  const groupsWithStudents = competitionGroups.map(g => ({
    ...g,
    students: allStudents.filter(s => s.groupId === g.id),
  }))

  // Judges and spectators hold wallets and logins but are not businesses: they
  // are excluded from every statement and from the standings.
  const tradingGroups = competitionGroups.filter(g => g.kind === 'team')
  const judgeGroup = competitionGroups.find(g => g.kind === 'judges') ?? null
  const spectatorGroups = competitionGroups.filter(g => g.kind === 'spectators')

  const statements = rankStatements(
    computeStatements({
      groups: tradingGroups,
      students: allStudents,
      transfers: allTransfers,
      fallbackStartingCapital: competition.initialBalance,
    })
  )

  const judges = judgeGroup ? allStudents.filter(s => s.groupId === judgeGroup.id) : []
  const spectatorIds = new Set(spectatorGroups.map(g => g.id))
  const spectators = allStudents.filter(s => spectatorIds.has(s.groupId))
  const totalStudents = allStudents.length - judges.length - spectators.length
  const totalGroups = tradingGroups.length
  const startDate = new Date(competition.startDate)
  const endDate = new Date(competition.endDate)
  const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))

  return (
    <div className="max-w-4xl">
        <div className="mb-6 flex items-center gap-2 flex-wrap">
          <Link
            href={competition.programmeId ? `/teacher/programmes/${competition.programmeId}` : '/teacher'}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 hover:border-ink/15 hover:text-orange px-3 py-1.5 rounded-lg shadow-sm transition"
          >
            ← Back
          </Link>
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-teal/15 text-teal-dark">
            {roleLabel(access.role)}
          </span>
          {competition.programmeId && (
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-orange/15 text-orange-dark">
              {competition.round === 2 ? 'Round 2 · final' : `Round 1${classRow ? ` · ${classRow.name}` : ''}`}
            </span>
          )}
        </div>

        <CompetitionHeader
          competition={competition}
          totalGroups={totalGroups}
          totalStudents={totalStudents}
          totalDays={totalDays}
          canEdit={access.canManage}
        />

        <CompetitionTabs
          groups={groupsWithStudents}
          initialBalance={competition.initialBalance}
          statements={statements}
          competitionId={competition.id}
          coOrganizers={coOrgRows}
          isOwner={access.canManageOrganisers}
          canManage={access.canManage}
          canAdvance={access.canAdvance && competition.round === 1 && competition.classId !== null}
          judgeCount={judges.length}
          spectatorCount={spectators.length}
        />
        <AutoRefresh />
    </div>
  )
}
