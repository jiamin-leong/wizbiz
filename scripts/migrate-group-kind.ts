import { db } from '../src/db/index'
import { sql } from 'drizzle-orm'

// Replaces the is_judge_panel boolean with a three-state kind, so round 2 can
// hold competing teams, judges and non-finalist spectators. Safe to re-run.
const STATEMENTS = [
  `DO $$ BEGIN
     CREATE TYPE "group_kind" AS ENUM ('team', 'judges', 'spectators');
   EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  `ALTER TABLE "groups" ADD COLUMN IF NOT EXISTS "kind" "group_kind" DEFAULT 'team' NOT NULL`,
  `UPDATE "groups" SET "kind" = 'judges'
     WHERE "kind" = 'team'
       AND EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'groups' AND column_name = 'is_judge_panel')
       AND COALESCE("is_judge_panel", false) = true`,
  `ALTER TABLE "groups" DROP COLUMN IF EXISTS "is_judge_panel"`,
]

async function main() {
  for (const statement of STATEMENTS) {
    await db.execute(sql.raw(statement))
    console.log('✓', statement.trim().split('\n')[0].slice(0, 76))
  }
  const counts = await db.execute(sql.raw(`SELECT kind, count(*)::int AS n FROM "groups" GROUP BY kind`))
  console.log('\ngroups by kind:', JSON.stringify(counts.rows ?? counts))
  process.exit(0)
}

main()
