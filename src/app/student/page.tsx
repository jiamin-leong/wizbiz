import { getSession } from '@/lib/auth'
import { logout, exitStudentPreview } from '@/lib/actions'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { db } from '@/db'
import { students, groups, competitions, transfers } from '@/db/schema'
import { eq, aliasedTable } from 'drizzle-orm'
import { BalanceProvider } from './BalanceContext'
import WalletCards from './WalletCards'
import StudentTabs from './StudentTabs'

export default async function StudentDashboard() {
  const session = await getSession()
  if (!session || session.role !== 'student') redirect('/')

  const cookieStore = await cookies()
  const isPreview = !!cookieStore.get('preview_teacher_id')

  const [[student], group, competition] = await Promise.all([
    db.select({ loginCode: students.loginCode, personalBalance: students.personalBalance }).from(students).where(eq(students.id, session.id)),
    db.select().from(groups).where(eq(groups.id, session.groupId)).then(r => r[0]),
    db.select({ name: competitions.name, initialBalance: competitions.initialBalance })
      .from(competitions).where(eq(competitions.id, session.competitionId)).then(r => r[0]),
  ])

  const allGroups = await db
    .select({ id: groups.id, name: groups.name, balance: groups.balance, kind: groups.kind })
    .from(groups)
    .where(eq(groups.competitionId, session.competitionId))

  // Judges and knocked-out spectators are not payable businesses.
  const otherGroups = allGroups.filter(g => g.id !== session.groupId && g.kind === 'team')

  const toGroups = aliasedTable(groups, 'to_group')
  const fromGroups = aliasedTable(groups, 'from_group')

  const [sentTx, receivedTx] = await Promise.all([
    db.select({ id: transfers.id, amount: transfers.amount, message: transfers.message, createdAt: transfers.createdAt, toStore: transfers.toStore, otherGroup: toGroups.name })
      .from(transfers)
      .leftJoin(toGroups, eq(toGroups.id, transfers.toGroupId))
      .where(eq(transfers.fromGroupId, session.groupId)),
    db.select({ id: transfers.id, amount: transfers.amount, message: transfers.message, createdAt: transfers.createdAt, otherGroup: fromGroups.name })
      .from(transfers)
      .innerJoin(fromGroups, eq(fromGroups.id, transfers.fromGroupId))
      .where(eq(transfers.toGroupId, session.groupId)),
  ])

  const historyEntries = [
    ...sentTx.map(t => ({ id: `sent-${t.id}`, type: 'sent' as const, description: 'WizCoins sent', otherGroup: t.toStore ? 'MAIN STORE' : (t.otherGroup ?? ''), amount: t.amount, message: t.message, createdAt: t.createdAt })),
    ...receivedTx.map(t => ({ id: `recv-${t.id}`, type: 'received' as const, description: 'WizCoins received', otherGroup: t.otherGroup, amount: t.amount, message: t.message, createdAt: t.createdAt })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  return (
    <BalanceProvider initialPersonal={student?.personalBalance ?? 0} initialBusiness={group.balance}>
      {isPreview && (
        <div className="fixed top-0 inset-x-0 z-50 bg-orange text-white flex items-center justify-between px-6 py-2.5 shadow-md">
          <div className="flex items-center gap-2 text-sm font-medium">
            <span>🔍</span>
            <span>You are previewing the student view</span>
          </div>
          <form action={exitStudentPreview}>
            <button className="text-sm font-semibold bg-white text-orange hover:bg-paper-2 px-3 py-1 rounded-lg transition">
              ← Exit Preview
            </button>
          </form>
        </div>
      )}

      <div className={`min-h-screen bg-paper-2 ${isPreview ? 'pt-12' : ''}`}>
        <header className="bg-ink border-b-4 border-orange px-6 py-8">
          <div className="max-w-4xl mx-auto">
            <div className="flex justify-between items-start mb-6">
              <div>
                <span className="chrome-text-dark text-2xl" style={{ fontWeight: 700 }}>WizBiz</span>
                <p className="text-paper/80 font-semibold text-base mt-0.5">{competition.name}</p>
              </div>
              {!isPreview && (
                <form action={logout}>
                  <button className="text-sm text-paper/70 hover:text-white border border-white/20 hover:border-white px-3 py-1.5 rounded-lg transition">
                    Logout
                  </button>
                </form>
              )}
            </div>

            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
              <div>
                <p className="text-paper/60 text-[10px] font-pixel tracking-[0.2em] mb-1">YOU ARE</p>
                <p className="text-white text-3xl font-extrabold tracking-wide">{student?.loginCode}</p>
                <p className="text-paper/80 text-base font-semibold mt-1">{group.name} group</p>
              </div>
              <WalletCards />
            </div>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-6 py-6">
          <StudentTabs
            otherGroups={otherGroups}
            initialHistory={historyEntries}
          />
        </main>
      </div>
    </BalanceProvider>
  )
}
