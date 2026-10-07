import { config } from 'dotenv'
config({ path: '.env.local' })
import { sql } from 'drizzle-orm'

// Additive. Neither a business nor a personal wallet can hold a negative
// balance: the database itself rejects any statement that would take it below
// zero, so two simultaneous payments cannot both pass the app's balance check
// and overspend.
async function main() {
  const { db } = await import('../src/db/index')

  const negative = await db.execute(sql.raw(
    `SELECT 'group' AS kind, id, balance FROM "groups" WHERE "balance" < 0
     UNION ALL SELECT 'student', id, personal_balance FROM "students" WHERE "personal_balance" < 0`
  ))
  if (negative.rows.length > 0) {
    console.error('Some wallets are already negative; fix them first:', JSON.stringify(negative.rows))
    process.exit(1)
  }

  for (const [table, name, column] of [
    ['groups', 'groups_balance_nonneg', 'balance'],
    ['students', 'students_personal_balance_nonneg', 'personal_balance'],
  ]) {
    await db.execute(sql.raw(`ALTER TABLE "${table}" DROP CONSTRAINT IF EXISTS "${name}"`))
    await db.execute(sql.raw(`ALTER TABLE "${table}" ADD CONSTRAINT "${name}" CHECK ("${column}" >= 0)`))
    console.log(`✓ ${table}.${column} >= 0`)
  }
  process.exit(0)
}

main()
