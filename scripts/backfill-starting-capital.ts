import { config } from 'dotenv'
import { db } from '../src/db/index'
import { groups, competitions } from '../src/db/schema'
import { eq, isNull } from 'drizzle-orm'

config({ path: '.env.local' })

// Statements now read groups.startingCapital so capital can vary with team size.
// Existing groups predate the column: seed them from their competition's flat
// initialBalance, which is exactly what their P/L was measured against before.
async function main() {
  const rows = await db
    .select({ groupId: groups.id, initialBalance: competitions.initialBalance })
    .from(groups)
    .innerJoin(competitions, eq(competitions.id, groups.competitionId))
    .where(isNull(groups.startingCapital))

  for (const row of rows) {
    await db
      .update(groups)
      .set({ startingCapital: row.initialBalance })
      .where(eq(groups.id, row.groupId))
  }

  console.log(`Backfilled starting capital for ${rows.length} group(s).`)
  process.exit(0)
}

main()
