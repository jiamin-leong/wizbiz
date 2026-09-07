import { db } from '../src/db/index'
import { sql } from 'drizzle-orm'

// Additive only. Safe to re-run.
const STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS "invites" (
     "id" serial PRIMARY KEY,
     "code" text NOT NULL UNIQUE,
     "label" text NOT NULL DEFAULT '',
     "class_id" integer,
     "used_at" timestamp,
     "used_by_teacher_id" integer REFERENCES "teachers"("id"),
     "created_at" timestamp DEFAULT now() NOT NULL
   )`,
  // Teachers onboarded by invite may sign in by link only, so a password is
  // no longer mandatory.
  `ALTER TABLE "teachers" ALTER COLUMN "password_hash" DROP NOT NULL`,
]

async function main() {
  for (const s of STATEMENTS) {
    await db.execute(sql.raw(s))
    console.log('✓', s.trim().split('\n')[0].slice(0, 70))
  }
  console.log('\nDone.')
  process.exit(0)
}

main()
