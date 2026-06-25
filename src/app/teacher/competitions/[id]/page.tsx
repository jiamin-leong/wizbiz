import { getSession } from '@/lib/auth'
import { db } from '@/db'
import { competitions, groups, students, listings } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import ListingApprovalQueue from './ListingApprovalQueue'

export default async function CompetitionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getSession()
  if (!session || session.role !== 'teacher') redirect('/')

  const [competition] = await db
    .select()
    .from(competitions)
    .where(and(eq(competitions.id, parseInt(id)), eq(competitions.teacherId, session.id)))

  if (!competition) redirect('/teacher')

  const competitionGroups = await db
    .select()
    .from(groups)
    .where(eq(groups.competitionId, competition.id))
    .orderBy(groups.id)

  const groupsWithStudents = await Promise.all(
    competitionGroups.map(async g => {
      const groupStudents = await db
        .select({ id: students.id, loginCode: students.loginCode })
        .from(students)
        .where(eq(students.groupId, g.id))
        .orderBy(students.loginCode)
      return { ...g, students: groupStudents }
    })
  )

  const pendingListings = await db
    .select({
      id: listings.id,
      name: listings.name,
      description: listings.description,
      price: listings.price,
      quantity: listings.quantity,
      groupId: listings.groupId,
    })
    .from(listings)
    .where(and(
      eq(listings.status, 'pending'),
    ))
    .orderBy(listings.createdAt)

  // Filter to only listings in this competition's groups
  const groupIds = new Set(competitionGroups.map(g => g.id))
  const filteredPending = pendingListings.filter(l => groupIds.has(l.groupId))
  const groupNameMap = Object.fromEntries(competitionGroups.map(g => [g.id, g.name]))

  return (
    <main className="min-h-screen bg-amber-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Link href="/teacher" className="text-sm text-gray-400 hover:underline">← Back to Dashboard</Link>
        </div>

        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold text-amber-600">{competition.name}</h1>
            <p className="text-sm text-gray-400 mt-1">
              {new Date(competition.startDate).toLocaleDateString()} → {new Date(competition.endDate).toLocaleDateString()} · Starting balance: {competition.initialBalance} WizCoins
            </p>
          </div>
          <span className={`text-xs font-medium px-3 py-1 rounded-full ${
            competition.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
          }`}>
            {competition.status}
          </span>
        </div>

        {/* Student Login Codes */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-gray-700 mb-3">Student Login Codes</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {groupsWithStudents.map(g => (
              <div key={g.id} className="bg-white rounded-xl shadow-sm p-4">
                <p className="font-semibold text-gray-700 mb-2">{g.name}</p>
                <div className="flex flex-wrap gap-2">
                  {g.students.map(s => (
                    <span key={s.id} className="bg-amber-100 text-amber-700 text-xs font-mono px-3 py-1 rounded-full">
                      {s.loginCode}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-2">Share these codes + the student password with your students.</p>
        </section>

        {/* Listing Approval Queue */}
        <section>
          <h2 className="text-lg font-semibold text-gray-700 mb-3">
            Pending Listings
            {filteredPending.length > 0 && (
              <span className="ml-2 bg-red-100 text-red-600 text-xs font-medium px-2 py-0.5 rounded-full">
                {filteredPending.length}
              </span>
            )}
          </h2>
          <ListingApprovalQueue listings={filteredPending} groupNameMap={groupNameMap} />
        </section>
      </div>
    </main>
  )
}
