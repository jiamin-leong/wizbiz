import { config } from 'dotenv'
config({ path: '.env.local' })
import { sql } from 'drizzle-orm'

// Additive. Lets MAIN STORE be the sender of a transfer: no sending group or
// student, but a flag and the admin teacher who sent it.
async function main() {
  const { db } = await import('../src/db/index')
  for (const stmt of [
    `ALTER TABLE "transfers" ALTER COLUMN "from_group_id" DROP NOT NULL`,
    `ALTER TABLE "transfers" ALTER COLUMN "sent_by_student_id" DROP NOT NULL`,
    `ALTER TABLE "transfers" ADD COLUMN IF NOT EXISTS "from_store" boolean DEFAULT false NOT NULL`,
    `ALTER TABLE "transfers" ADD COLUMN IF NOT EXISTS "sent_by_teacher_id" integer REFERENCES "teachers"("id")`,
  ]) {
    await db.execute(sql.raw(stmt))
    console.log('✓', stmt)
  }
  process.exit(0)
}

main()
