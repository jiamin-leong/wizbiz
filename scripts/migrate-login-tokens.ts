import { db } from '../src/db/index'
import { sql } from 'drizzle-orm'

// Additive only. Safe to re-run.
const STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS "login_tokens" (
     "id" serial PRIMARY KEY,
     "teacher_id" integer NOT NULL REFERENCES "teachers"("id"),
     "token_hash" text NOT NULL UNIQUE,
     "expires_at" timestamp NOT NULL,
     "used_at" timestamp,
     "created_at" timestamp DEFAULT now() NOT NULL
   )`,
  `CREATE INDEX IF NOT EXISTS "login_tokens_teacher_idx" ON "login_tokens" ("teacher_id")`,
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
