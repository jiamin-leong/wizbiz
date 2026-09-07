import { db } from '../src/db/index'
import { competitions, groups, students, participants } from '../src/db/schema'
import { eq, inArray, sql } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import { generateGroupPasswords } from '../src/lib/credentials'
import { GROUP_THEMES, THEME_NAMES } from '../src/lib/themes'

// Shortens credentials for an existing programme, for 12-year-olds to type:
//   password    PULSE-123    -> PULSE
//   login code  ANIMALS-BEAR -> BEAR
//
// Both must stay unique programme-wide, since the bare code is the entire
// login and the same teams meet again in round 2. Themes share names (CORAL is
// both a colour and an ocean word), so a few students are reassigned a spare
// name; those are reported individually.
//
//   npx tsx --env-file=.env.local scripts/shorten-credentials.ts 1 [--confirm]

const PROGRAMME_ID = Number(process.argv[2]) || 1
const CONFIRM = process.argv.includes('--confirm')

async function main() {
  const comps = await db
    .select({ id: competitions.id, name: competitions.name, round: competitions.round })
    .from(competitions)
    .where(eq(competitions.programmeId, PROGRAMME_ID))
  const compIds = comps.map(c => c.id)

  const groupRows = await db
    .select({ id: groups.id, competitionId: groups.competitionId, name: groups.name, kind: groups.kind, password: groups.groupPassword })
    .from(groups)
    .where(inArray(groups.competitionId, compIds))

  const studentRows = await db
    .select({ id: students.id, groupId: students.groupId, loginCode: students.loginCode, participantId: students.participantId })
    .from(students)
    .where(inArray(students.groupId, groupRows.map(g => g.id)))

  const participantRows = await db
    .select({ id: participants.id, loginCode: participants.loginCode })
    .from(participants)
    .where(eq(participants.programmeId, PROGRAMME_ID))

  // ── login codes ──
  // A team keeps one identity across rounds, so the same code must be assigned
  // to a student wherever they appear. Key by the old code, which is already
  // unique programme-wide.
  const oldCodes = [...new Set(studentRows.map(s => s.loginCode))]
  const spare = [...new Set(THEME_NAMES.flatMap(t => GROUP_THEMES[t]))]
  const used = new Set<string>()
  const newCodeByOld = new Map<string, string>()
  const reassigned: [string, string, string][] = []

  // Pass 1: everyone whose bare name is unclaimed keeps it.
  for (const old of oldCodes) {
    const bare = old.includes('-') ? old.split('-').slice(1).join('-') : old
    if (!used.has(bare)) {
      used.add(bare)
      newCodeByOld.set(old, bare)
    }
  }
  // Pass 2: the rest take a spare name.
  for (const old of oldCodes) {
    if (newCodeByOld.has(old)) continue
    const bare = old.includes('-') ? old.split('-').slice(1).join('-') : old
    const replacement = spare.find(x => !used.has(x))
    if (!replacement) throw new Error('Ran out of spare login codes.')
    used.add(replacement)
    newCodeByOld.set(old, replacement)
    reassigned.push([old, bare, replacement])
  }

  // ── passwords ──
  // One password per team identity, shared by that team's round 1 and round 2
  // groups so a finalist's password does not change mid-competition.
  const identity = (g: typeof groupRows[number]) => `${g.kind}:${g.name}`
  const identities = [...new Set(groupRows.map(identity))]
  const words = generateGroupPasswords(identities.length)
  const passwordByIdentity = new Map(identities.map((k, i) => [k, words[i]]))

  console.log(`Programme ${PROGRAMME_ID}: ${comps.length} competitions, ${groupRows.length} groups, ${studentRows.length} student rows`)
  console.log(`  login codes  ${oldCodes.length} distinct -> all shortened, ${reassigned.length} reassigned to avoid a clash`)
  for (const [old, wanted, got] of reassigned) console.log(`      ${old} -> ${wanted} taken, using ${got}`)
  console.log(`  passwords    ${identities.length} distinct team passwords, one word each`)
  console.log(`  examples     ${identities.slice(0, 4).map(k => `${k.split(':')[1]}=${passwordByIdentity.get(k)}`).join('  ')}`)

  if (!CONFIRM) {
    console.log('\nDry run. Re-run with --confirm to apply.')
    process.exit(0)
  }

  // Hash each distinct password once, not once per group.
  const hashByWord = new Map(
    await Promise.all(words.map(async w => [w, await bcrypt.hash(w, 10)] as const))
  )

  const groupValues = groupRows.map(g => {
    const word = passwordByIdentity.get(identity(g))!
    return `(${g.id}, '${word}', '${hashByWord.get(word)!}')`
  }).join(',')
  await db.execute(sql.raw(
    `UPDATE "groups" SET "group_password" = v.pw, "group_password_hash" = v.hash
     FROM (VALUES ${groupValues}) AS v(id, pw, hash) WHERE "groups"."id" = v.id`
  ))

  const studentValues = studentRows.map(s => {
    const g = groupRows.find(x => x.id === s.groupId)!
    const word = passwordByIdentity.get(identity(g))!
    return `(${s.id}, '${newCodeByOld.get(s.loginCode)!}', '${hashByWord.get(word)!}')`
  }).join(',')
  await db.execute(sql.raw(
    `UPDATE "students" SET "login_code" = v.code, "password_hash" = v.hash
     FROM (VALUES ${studentValues}) AS v(id, code, hash) WHERE "students"."id" = v.id`
  ))

  if (participantRows.length > 0) {
    const partValues = participantRows.map(p => {
      const s = studentRows.find(x => x.participantId === p.id)
      const g = s ? groupRows.find(x => x.id === s.groupId) : undefined
      const word = g ? passwordByIdentity.get(identity(g))! : words[0]
      return `(${p.id}, '${newCodeByOld.get(p.loginCode) ?? p.loginCode}', '${hashByWord.get(word)!}')`
    }).join(',')
    await db.execute(sql.raw(
      `UPDATE "participants" SET "login_code" = v.code, "password_hash" = v.hash
       FROM (VALUES ${partValues}) AS v(id, code, hash) WHERE "participants"."id" = v.id`
    ))
  }

  console.log('\nUpdated. Credentials are now one word each.')
  process.exit(0)
}

main()
