import { db } from '../src/db/index'
import { sql } from 'drizzle-orm'

// Additive only: new tables, and new columns that are nullable or defaulted.
// No drops, no type changes, no rewrites of existing rows. Safe to re-run.
const STATEMENTS: string[] = [
  `CREATE TABLE IF NOT EXISTS "programmes" (
     "id" serial PRIMARY KEY,
     "owner_teacher_id" integer NOT NULL REFERENCES "teachers"("id"),
     "name" text NOT NULL,
     "created_at" timestamp DEFAULT now() NOT NULL
   )`,

  `CREATE TABLE IF NOT EXISTS "classes" (
     "id" serial PRIMARY KEY,
     "programme_id" integer NOT NULL REFERENCES "programmes"("id"),
     "teacher_id" integer REFERENCES "teachers"("id"),
     "name" text NOT NULL,
     "headcount" integer NOT NULL,
     "theme_offset" integer DEFAULT 0 NOT NULL,
     "created_at" timestamp DEFAULT now() NOT NULL
   )`,

  `CREATE TABLE IF NOT EXISTS "teams" (
     "id" serial PRIMARY KEY,
     "class_id" integer NOT NULL REFERENCES "classes"("id"),
     "name" text NOT NULL,
     "created_at" timestamp DEFAULT now() NOT NULL
   )`,

  `CREATE TABLE IF NOT EXISTS "participants" (
     "id" serial PRIMARY KEY,
     "programme_id" integer NOT NULL REFERENCES "programmes"("id"),
     "class_id" integer NOT NULL REFERENCES "classes"("id"),
     "team_id" integer NOT NULL REFERENCES "teams"("id"),
     "login_code" text NOT NULL,
     "password_hash" text NOT NULL,
     "created_at" timestamp DEFAULT now() NOT NULL
   )`,

  `CREATE UNIQUE INDEX IF NOT EXISTS "participants_programme_login_code_idx"
     ON "participants" ("programme_id", "login_code")`,

  `ALTER TABLE "competitions" ADD COLUMN IF NOT EXISTS "programme_id" integer REFERENCES "programmes"("id")`,
  `ALTER TABLE "competitions" ADD COLUMN IF NOT EXISTS "class_id" integer REFERENCES "classes"("id")`,
  `ALTER TABLE "competitions" ADD COLUMN IF NOT EXISTS "round" integer DEFAULT 1 NOT NULL`,

  `ALTER TABLE "groups" ADD COLUMN IF NOT EXISTS "team_id" integer REFERENCES "teams"("id")`,
  `ALTER TABLE "groups" ADD COLUMN IF NOT EXISTS "starting_capital" integer`,
  `ALTER TABLE "groups" ADD COLUMN IF NOT EXISTS "qualified" boolean DEFAULT false NOT NULL`,
  `ALTER TABLE "groups" ADD COLUMN IF NOT EXISTS "qualified_rank" integer`,
  `ALTER TABLE "groups" ADD COLUMN IF NOT EXISTS "is_judge_panel" boolean DEFAULT false NOT NULL`,

  `ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "participant_id" integer REFERENCES "participants"("id")`,

  // Statements read groups.starting_capital now; seed existing groups from the
  // flat competition balance their P/L was already measured against.
  `UPDATE "groups" g
     SET "starting_capital" = c."initial_balance"
     FROM "competitions" c
    WHERE c."id" = g."competition_id"
      AND g."starting_capital" IS NULL`,
]

async function main() {
  for (const statement of STATEMENTS) {
    const label = statement.trim().split('\n')[0].slice(0, 78)
    await db.execute(sql.raw(statement))
    console.log('✓', label)
  }
  console.log(`\nDone — ${STATEMENTS.length} statements applied.`)
  process.exit(0)
}

main()
