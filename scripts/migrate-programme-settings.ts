import { db } from '../src/db/index'
import { sql } from 'drizzle-orm'

// Additive. Safe to re-run.
const STATEMENTS = [
  `ALTER TABLE "programmes" ADD COLUMN IF NOT EXISTS "start_date" timestamp`,
  `ALTER TABLE "programmes" ADD COLUMN IF NOT EXISTS "end_date" timestamp`,
  `ALTER TABLE "programmes" ADD COLUMN IF NOT EXISTS "group_capital" integer`,
  `ALTER TABLE "programmes" ADD COLUMN IF NOT EXISTS "personal_starting_balance" integer`,
]

async function main() {
  for (const s of STATEMENTS) {
    await db.execute(sql.raw(s))
    console.log('✓', s.slice(0, 68))
  }
  console.log('\nDone.')
  process.exit(0)
}
main()
