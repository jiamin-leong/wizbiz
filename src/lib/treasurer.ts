import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { students } from '@/db/schema'

/**
 * A team's treasurer is its first member — first by login code, the same order
 * teachers see in the Teams table. Only the treasurer can pay from the shared
 * business wallet; the rest of the team can still see it.
 */
export async function treasurerForGroup(groupId: number): Promise<{ id: number; loginCode: string } | null> {
  const members = await db
    .select({ id: students.id, loginCode: students.loginCode })
    .from(students)
    .where(eq(students.groupId, groupId))
  if (members.length === 0) return null
  return members.sort((a, b) => a.loginCode.localeCompare(b.loginCode))[0]
}
