import { config } from 'dotenv'
import { db } from '../src/db/index'
import { competitions, groups, students } from '../src/db/schema'
import { eq } from 'drizzle-orm'

config({ path: '.env.local' })

async function main() {
  // Delete students and groups for competition 2, then the competition itself
  const competitionGroups = await db.select().from(groups).where(eq(groups.competitionId, 2))
  for (const g of competitionGroups) {
    await db.delete(students).where(eq(students.groupId, g.id))
  }
  await db.delete(groups).where(eq(groups.competitionId, 2))
  await db.delete(competitions).where(eq(competitions.id, 2))
  console.log('Deleted competition 2 and all its groups/students')
  process.exit(0)
}

main()
