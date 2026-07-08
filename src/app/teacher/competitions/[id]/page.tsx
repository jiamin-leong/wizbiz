import { getSession } from '@/lib/auth'
import { db } from '@/db'
import { competitions, groups, students, listings, competitionOrganizers, teachers } from '@/db/schema'
import { eq, and, inArray } from 'drizzle-orm'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import CompetitionTabs from './CompetitionTabs'
import CompetitionHeader from './CompetitionHeader'
import AutoRefresh from './AutoRefresh'

export default async function CompetitionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getSession()
  if (!session || session.role !== 'teacher') redirect('/')

  const [competition] = await db
    .select()
    .from(competitions)
    .where(eq(competitions.id, parseInt(id)))

  if (!competition) redirect('/teacher')

  const isOwner = competition.teacherId === session.id
  if (!isOwner) {
    const [coOrg] = await db.select({ id: competitionOrganizers.id })
      .from(competitionOrganizers)
      .where(and(eq(competitionOrganizers.competitionId, competition.id), eq(competitionOrganizers.teacherId, session.id)))
    if (!coOrg) redirect('/teacher')
  }

  const competitionGroups = await db
    .select()
    .from(groups)
    .where(eq(groups.competitionId, competition.id))
    .orderBy(groups.id)

  const groupIds = competitionGroups.map(g => g.id)
  const groupNameMap = Object.fromEntries(competitionGroups.map(g => [g.id, g.name]))

  // Fetch students, pending listings, and co-organizers in parallel
  const [allStudents, filteredPending, coOrgRows] = await Promise.all([
    db.select({ id: students.id, loginCode: students.loginCode, groupId: students.groupId })
      .from(students)
      .where(inArray(students.groupId, groupIds))
      .orderBy(students.loginCode),
    db.select({ id: listings.id, name: listings.name, description: listings.description, price: listings.price, quantity: listings.quantity, groupId: listings.groupId })
      .from(listings)
      .where(and(eq(listings.status, 'pending'), inArray(listings.groupId, groupIds)))
      .orderBy(listings.createdAt),
    db.select({ id: teachers.id, name: teachers.name, email: teachers.email })
      .from(competitionOrganizers)
      .innerJoin(teachers, eq(teachers.id, competitionOrganizers.teacherId))
      .where(eq(competitionOrganizers.competitionId, competition.id)),
  ])

  const groupsWithStudents = competitionGroups.map(g => ({
    ...g,
    students: allStudents.filter(s => s.groupId === g.id),
  }))

  const totalStudents = allStudents.length
  const totalGroups = competitionGroups.length
  const startDate = new Date(competition.startDate)
  const endDate = new Date(competition.endDate)
  const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))

  return (
    <div className="max-w-4xl">
        <div className="mb-6">
          <Link href="/teacher" className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 hover:border-ink/15 hover:text-orange px-3 py-1.5 rounded-lg shadow-sm transition">
            ← Back
          </Link>
        </div>

        <CompetitionHeader
          competition={competition}
          totalGroups={totalGroups}
          totalStudents={totalStudents}
          totalDays={totalDays}
        />

        <CompetitionTabs
          groups={groupsWithStudents}
          initialBalance={competition.initialBalance}
          listings={filteredPending}
          groupNameMap={groupNameMap}
          competitionId={competition.id}
          coOrganizers={coOrgRows}
          isOwner={isOwner}
        />
        <AutoRefresh />
    </div>
  )
}
