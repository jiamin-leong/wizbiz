import { getSession } from '@/lib/auth'
import { db } from '@/db'
import { competitions, groups, students, listings } from '@/db/schema'
import { eq, and, inArray } from 'drizzle-orm'
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

  const groupIds = competitionGroups.map(g => g.id)
  const groupNameMap = Object.fromEntries(competitionGroups.map(g => [g.id, g.name]))

  // Single query for all students + pending listings in parallel
  const [allStudents, filteredPending] = await Promise.all([
    db.select({ id: students.id, loginCode: students.loginCode, groupId: students.groupId })
      .from(students)
      .where(inArray(students.groupId, groupIds))
      .orderBy(students.loginCode),
    db.select({ id: listings.id, name: listings.name, description: listings.description, price: listings.price, quantity: listings.quantity, groupId: listings.groupId })
      .from(listings)
      .where(and(eq(listings.status, 'pending'), inArray(listings.groupId, groupIds)))
      .orderBy(listings.createdAt),
  ])

  const groupsWithStudents = competitionGroups.map(g => ({
    ...g,
    students: allStudents.filter(s => s.groupId === g.id),
  }))

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

        {/* Student Credentials */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-gray-700 mb-3">Student Login Credentials</h2>
          <div className="bg-amber-100 border border-amber-300 rounded-xl p-4 mb-4 flex items-center gap-4">
            <div>
              <p className="text-xs text-amber-700 font-medium uppercase tracking-wide mb-1">Shared Password</p>
              <p className="text-2xl font-bold font-mono text-amber-800">{competition.studentPassword}</p>
            </div>
            <p className="text-xs text-amber-600 ml-auto max-w-xs text-right">All students use this password. Share it with your class along with their login code.</p>
          </div>
          <h3 className="text-sm font-semibold text-gray-600 mb-2">Login Codes by Group</h3>
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
