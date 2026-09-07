import { db } from '../src/db/index'
import { programmes, competitions, groups, students, participants } from '../src/db/schema'
import { eq, inArray, sql } from 'drizzle-orm'
import { GROUP_THEMES, THEME_NAMES } from '../src/lib/themes'
import { JUDGE_NAME_POOL } from '../src/lib/credentials'

// Re-issues one programme's student login codes from names no other programme
// uses, so a code can never identify students in two programmes at once.
//
// Login resolves a bare code across every competition and leans on the password
// to disambiguate. That works while no two students share both — but that is
// luck rather than design, and a collision would leave a student picking a
// competition from a list on hackathon morning.
//
//   npx tsx --env-file=.env.local scripts/reissue-login-codes.ts 1 [--confirm]

const PROGRAMME_ID = Number(process.argv[2]) || 1
const CONFIRM = process.argv.includes('--confirm')

async function codesFor(programmeId: number): Promise<Set<string>> {
  const comps = await db.select({ id: competitions.id }).from(competitions).where(eq(competitions.programmeId, programmeId))
  const ids = comps.map(c => c.id)
  if (ids.length === 0) return new Set()
  const g = await db.select({ id: groups.id }).from(groups).where(inArray(groups.competitionId, ids))
  if (g.length === 0) return new Set()
  const st = await db.select({ loginCode: students.loginCode }).from(students).where(inArray(students.groupId, g.map(x => x.id)))
  return new Set(st.map(s => s.loginCode))
}

async function main() {
  const [target] = await db.select().from(programmes).where(eq(programmes.id, PROGRAMME_ID))
  if (!target) throw new Error(`No programme ${PROGRAMME_ID}`)

  const others = (await db.select().from(programmes)).filter(p => p.id !== PROGRAMME_ID)

  // Every name in use anywhere else stays off limits.
  const reserved = new Set<string>()
  for (const p of others) for (const c of await codesFor(p.id)) reserved.add(c)

  const mine = await codesFor(PROGRAMME_ID)
  // ALPHA..HOTEL were handed to every final, so any programme creating one
  // later would mint the same codes. Move them even if nothing clashes today.
  const LEGACY_JUDGE_CODES = new Set(['ALPHA', 'BRAVO', 'CHARLIE', 'DELTA', 'ECHO', 'FOXTROT', 'GOLF', 'HOTEL'])
  const clashing = [...mine].filter(c => reserved.has(c) || LEGACY_JUDGE_CODES.has(c))

  // Judge names come from their own pool; both feed the same free list.
  const allNames = [...new Set([...THEME_NAMES.flatMap(t => GROUP_THEMES[t]), ...JUDGE_NAME_POOL])]
  const pool = allNames.filter(n => !reserved.has(n))

  console.log(`Programme #${PROGRAMME_ID} "${target.name}"`)
  console.log(`  its login codes            : ${mine.size}`)
  console.log(`  reserved by other programmes: ${reserved.size}`)
  console.log(`  currently clashing          : ${clashing.length}${clashing.length ? ` (${clashing.slice(0, 6).join(', ')}…)` : ''}`)
  console.log(`  names free to draw from     : ${pool.length}`)

  if (pool.length < mine.size) {
    throw new Error(`Not enough free names: need ${mine.size}, have ${pool.length}.`)
  }
  if (clashing.length === 0) {
    console.log('\nNothing overlaps. Nothing to do.')
    process.exit(0)
  }

  // Keep a code that is already unique; only the clashing ones move, so the
  // credentials people may already be holding change as little as possible.
  const keep = [...mine].filter(c => !reserved.has(c))
  const used = new Set(keep)
  const spare = pool.filter(n => !used.has(n))

  const remap = new Map<string, string>()
  let i = 0
  for (const old of clashing) {
    const replacement = spare[i++]
    remap.set(old, replacement)
    used.add(replacement)
  }

  console.log(`\n  keeping ${keep.length} codes unchanged, moving ${remap.size}`)
  for (const [from, to] of [...remap].slice(0, 8)) console.log(`      ${from} -> ${to}`)
  if (remap.size > 8) console.log(`      … and ${remap.size - 8} more`)

  if (!CONFIRM) {
    console.log('\nDry run. Re-run with --confirm to apply.')
    process.exit(0)
  }

  // A person keeps one code across both rounds, so remap by code, not by row.
  const comps = await db.select({ id: competitions.id }).from(competitions).where(eq(competitions.programmeId, PROGRAMME_ID))
  const compIds = comps.map(c => c.id)
  const g = await db.select({ id: groups.id }).from(groups).where(inArray(groups.competitionId, compIds))
  const st = await db.select({ id: students.id, loginCode: students.loginCode })
    .from(students).where(inArray(students.groupId, g.map(x => x.id)))

  const movingStudents = st.filter(s => remap.has(s.loginCode))
  const values = movingStudents.map(s => `(${s.id}, '${remap.get(s.loginCode)!}')`).join(',')
  await db.execute(sql.raw(
    `UPDATE "students" SET "login_code" = v.code FROM (VALUES ${values}) AS v(id, code) WHERE "students"."id" = v.id`
  ))

  const parts = await db.select({ id: participants.id, loginCode: participants.loginCode })
    .from(participants).where(eq(participants.programmeId, PROGRAMME_ID))
  const movingParts = parts.filter(p => remap.has(p.loginCode))
  if (movingParts.length > 0) {
    const pv = movingParts.map(p => `(${p.id}, '${remap.get(p.loginCode)!}')`).join(',')
    await db.execute(sql.raw(
      `UPDATE "participants" SET "login_code" = v.code FROM (VALUES ${pv}) AS v(id, code) WHERE "participants"."id" = v.id`
    ))
  }

  console.log(`\nUpdated ${movingStudents.length} student rows and ${movingParts.length} participant rows.`)
  process.exit(0)
}

main()
