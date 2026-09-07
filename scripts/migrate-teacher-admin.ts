import { db } from '../src/db/index'
import { sql } from 'drizzle-orm'

// Additive. Promotes the founding account so the admin panel stays reachable.
const ADMIN_EMAIL = process.argv[2] ?? 'teacher@wizbiz.com'

async function main() {
  await db.execute(sql.raw(
    `ALTER TABLE "teachers" ADD COLUMN IF NOT EXISTS "is_admin" boolean DEFAULT false NOT NULL`
  ))
  console.log('✓ teachers.is_admin')

  const res = await db.execute(sql.raw(
    `UPDATE "teachers" SET "is_admin" = true WHERE lower("email") = lower('${ADMIN_EMAIL.replace(/'/g, "''")}')`
  ))
  console.log(`✓ promoted ${ADMIN_EMAIL}`, JSON.stringify(res.rowCount ?? ''))

  const rows = await db.execute(sql.raw(`SELECT email, is_admin FROM "teachers" ORDER BY id`))
  console.log('\n', JSON.stringify(rows.rows ?? rows, null, 1))
  process.exit(0)
}

main()
