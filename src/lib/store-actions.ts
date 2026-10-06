'use server'

import { db } from '@/db'
import { groups, transfers } from '@/db/schema'
import { eq, sql } from 'drizzle-orm'
import { requireTeacher, teacherIsAdmin } from '@/lib/authz'
import { storeLimitForGroup } from '@/lib/main-store'

/**
 * MAIN STORE pays a team. The money lands in the team's business wallet and,
 * being an inbound transfer, counts as that team's revenue in its statement.
 * The store can only pay out what it holds.
 */
export async function sendFromStore(groupId: number, amount: number, message: string) {
  const session = await requireTeacher()
  if (!(await teacherIsAdmin(session.id))) return { error: 'Only admins can pay from MAIN STORE.' }
  if (!Number.isInteger(amount) || amount < 1) return { error: 'Amount must be a whole number of at least 1.' }

  const [group] = await db.select({ kind: groups.kind }).from(groups).where(eq(groups.id, groupId))
  if (!group) return { error: 'Team not found.' }
  if (group.kind !== 'team') return { error: 'MAIN STORE can only pay trading teams.' }

  const available = await storeLimitForGroup(groupId)
  if (amount > available) return { error: `MAIN STORE only has ${Math.max(available, 0).toLocaleString()} WizCoins available for this team.` }

  await db.batch([
    db.update(groups).set({ balance: sql`${groups.balance} + ${amount}` }).where(eq(groups.id, groupId)),
    db.insert(transfers).values({
      fromGroupId: null,
      toGroupId: groupId,
      fromStore: true,
      sentByTeacherId: session.id,
      amount,
      message: message.trim() || null,
    }),
  ])

  return { success: true }
}
