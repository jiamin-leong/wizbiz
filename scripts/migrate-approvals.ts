import { db } from '../src/db/index'
import { sql } from 'drizzle-orm'

// Additive. Existing accounts are approved retroactively so nobody is locked out.
async function main() {
  await db.execute(sql.raw(`ALTER TABLE "teachers" ADD COLUMN IF NOT EXISTS "approved_at" timestamp`))
  console.log('✓ teachers.approved_at')
  const res = await db.execute(sql.raw(`UPDATE "teachers" SET "approved_at" = now() WHERE "approved_at" IS NULL`))
  console.log(`✓ approved ${res.rowCount ?? '?'} existing account(s)`)
  process.exit(0)
}
main()
