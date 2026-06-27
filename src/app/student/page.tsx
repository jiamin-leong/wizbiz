import { getSession } from '@/lib/auth'
import { logout, exitStudentPreview } from '@/lib/actions'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { db } from '@/db'
import { students, groups, competitions, listings } from '@/db/schema'
import { eq, and, inArray, ne, gt, desc } from 'drizzle-orm'
import MarketplaceTab from './MarketplaceTab'
import MyListingsTab from './MyListingsTab'
import StudentTabs from './StudentTabs'

export default async function StudentDashboard() {
  const session = await getSession()
  if (!session || session.role !== 'student') redirect('/')

  const cookieStore = await cookies()
  const isPreview = !!cookieStore.get('preview_teacher_id')

  const [[student], group, competition] = await Promise.all([
    db.select({ loginCode: students.loginCode }).from(students).where(eq(students.id, session.id)),
    db.select().from(groups).where(eq(groups.id, session.groupId)).then(r => r[0]),
    db.select({ name: competitions.name, initialBalance: competitions.initialBalance })
      .from(competitions).where(eq(competitions.id, session.competitionId)).then(r => r[0]),
  ])

  const allGroupIds = await db
    .select({ id: groups.id })
    .from(groups)
    .where(eq(groups.competitionId, session.competitionId))
    .then(r => r.map(g => g.id))

  const otherGroupIds = allGroupIds.filter(id => id !== session.groupId)

  const [marketplaceListings, myListings] = await Promise.all([
    otherGroupIds.length > 0
      ? db.select({
          id: listings.id,
          name: listings.name,
          description: listings.description,
          price: listings.price,
          quantity: listings.quantity,
          groupId: listings.groupId,
          groupName: groups.name,
        })
        .from(listings)
        .innerJoin(groups, eq(groups.id, listings.groupId))
        .where(and(
          eq(listings.status, 'approved'),
          inArray(listings.groupId, otherGroupIds),
          gt(listings.quantity, 0),
        ))
        .orderBy(listings.createdAt)
      : Promise.resolve([]),
    db.select({
      id: listings.id,
      name: listings.name,
      description: listings.description,
      price: listings.price,
      quantity: listings.quantity,
      status: listings.status,
    })
    .from(listings)
    .where(eq(listings.groupId, session.groupId))
    .orderBy(desc(listings.createdAt)),
  ])

  const balanceChange = group.balance - competition.initialBalance

  return (
    <>
      {isPreview && (
        <div className="fixed top-0 inset-x-0 z-50 bg-amber-500 text-white flex items-center justify-between px-6 py-2.5 shadow-md">
          <div className="flex items-center gap-2 text-sm font-medium">
            <span>🔍</span>
            <span>You are previewing the student view</span>
          </div>
          <form action={exitStudentPreview}>
            <button className="text-sm font-semibold bg-white text-amber-600 hover:bg-amber-50 px-3 py-1 rounded-lg transition">
              ← Exit Preview
            </button>
          </form>
        </div>
      )}

      <div className={`min-h-screen bg-amber-50 ${isPreview ? 'pt-12' : ''}`}>
        {/* Header */}
        <header className="bg-white border-b border-amber-100 px-6 py-4">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div>
              <span className="text-lg font-extrabold text-amber-600">WizBiz</span>
              <span className="ml-2 text-xs text-gray-400 font-medium">{competition.name}</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-xs text-gray-400 font-medium">{student?.loginCode} · {group.name}</p>
                <p className="text-lg font-extrabold text-amber-600">{group.balance.toLocaleString()} WC</p>
                <p className={`text-xs font-medium ${balanceChange >= 0 ? 'text-green-500' : 'text-red-400'}`}>
                  {balanceChange >= 0 ? `▲ ${balanceChange.toLocaleString()}` : `▼ ${Math.abs(balanceChange).toLocaleString()}`} from start
                </p>
              </div>
              {!isPreview && (
                <form action={logout}>
                  <button className="text-xs text-gray-400 hover:text-gray-600 border border-gray-200 px-3 py-1.5 rounded-lg transition">
                    Logout
                  </button>
                </form>
              )}
            </div>
          </div>
        </header>

        {/* Tabs + Content */}
        <main className="max-w-4xl mx-auto px-6 py-6">
          <StudentTabs
            marketplaceTab={<MarketplaceTab listings={marketplaceListings} balance={group.balance} />}
            myListingsTab={<MyListingsTab listings={myListings} />}
            pendingCount={myListings.filter(l => l.status === 'pending').length}
          />
        </main>
      </div>
    </>
  )
}
