import { config } from 'dotenv'
import { db } from '../src/db/index'
import { students } from '../src/db/schema'
import { eq } from 'drizzle-orm'

config({ path: '.env.local' })

const STARTING_PERSONAL_BALANCE = 1000

async function main() {
  const allStudents = await db.select({ id: students.id, personalBalance: students.personalBalance }).from(students)
  let updated = 0
  for (const s of allStudents) {
    // Only seed students still at the default (0) so re-runs don't clobber earned balances.
    if (s.personalBalance === 0) {
      await db.update(students).set({ personalBalance: STARTING_PERSONAL_BALANCE }).where(eq(students.id, s.id))
      updated++
    }
  }
  console.log(`Backfilled ${updated} of ${allStudents.length} students to ${STARTING_PERSONAL_BALANCE}.`)
  process.exit(0)
}

main()
