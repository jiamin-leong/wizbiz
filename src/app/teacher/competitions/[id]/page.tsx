import { getSession } from '@/lib/auth'
import { db } from '@/db'
import { competitions, groups, students, listings } from '@/db/schema'
import { eq, and, inArray } from 'drizzle-orm'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import ListingApprovalQueue from './ListingApprovalQueue'
import AutoRefresh from './AutoRefresh'

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

  const totalStudents = allStudents.length
  const totalGroups = competitionGroups.length
  const startDate = new Date(competition.startDate)
  const endDate = new Date(competition.endDate)
  const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))

  return (
    <div className="max-w-4xl">
        <div className="mb-6">
          <Link href="/teacher" className="text-sm text-gray-400 hover:underline">← Back</Link>
        </div>

        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
          <div className="flex justify-between items-start mb-5">
            <h1 className="text-3xl font-extrabold text-gray-900">{competition.name}</h1>
            <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
              competition.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
            }`}>
              {competition.status}
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            <div className="col-span-2 sm:col-span-2 bg-amber-50 rounded-xl p-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Duration</p>
              <p className="text-base font-bold text-gray-800">
                {startDate.toLocaleDateString()} → {endDate.toLocaleDateString()}
              </p>
              <p className="text-sm text-amber-500 font-medium mt-0.5">{totalDays} days</p>
            </div>
            <div className="bg-amber-50 rounded-xl p-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Groups</p>
              <p className="text-3xl font-extrabold text-amber-600">{totalGroups}</p>
            </div>
            <div className="bg-amber-50 rounded-xl p-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Students</p>
              <p className="text-3xl font-extrabold text-amber-600">{totalStudents}</p>
            </div>
            <div className="bg-amber-50 rounded-xl p-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Starting Balance</p>
              <p className="text-xl font-extrabold text-amber-600">{competition.initialBalance.toLocaleString()}</p>
              <p className="text-xs text-gray-400 mt-0.5">WizCoins</p>
            </div>
          </div>
        </div>

        {/* Student Credentials */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-gray-700 mb-3">Student Login Credentials</h2>
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-amber-50 border-b border-amber-100">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-12">#</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-32">Group</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-16">Count</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-amber-600 uppercase tracking-wide w-36">WizCoins</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-36">Password</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Participants</th>
                </tr>
              </thead>
              <tbody>
                {groupsWithStudents.map((g, i) => (
                  <tr key={g.id} className="border-b border-gray-50 last:border-0 hover:bg-amber-50/40 transition">
                    <td className="px-4 py-3 text-gray-400 font-medium">{i + 1}</td>
                    <td className="px-4 py-3 font-semibold text-gray-700">{g.name}</td>
                    <td className="px-4 py-3 font-semibold text-gray-700">{g.students.length}</td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-sm bg-gray-100 text-gray-700 px-2 py-1 rounded">{g.groupPassword || '—'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-bold text-amber-600">{g.balance.toLocaleString()}</span>
                      <span className="text-xs text-gray-400 ml-1">
                        {g.balance >= competition.initialBalance
                          ? <span className="text-green-500">▲ {(g.balance - competition.initialBalance).toLocaleString()}</span>
                          : <span className="text-red-400">▼ {(competition.initialBalance - g.balance).toLocaleString()}</span>}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        {g.students.map(s => (
                          <span key={s.id} className="bg-amber-100 text-amber-700 text-xs font-mono px-2.5 py-1 rounded-full">
                            {s.loginCode}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-400 mt-2">Share these codes + the shared password with your students.</p>
          <AutoRefresh />
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
  )
}
