import { db } from '../src/db/index'
import { classes, competitions, groups, students, teams, participants, programmes } from '../src/db/schema'
import { eq, and, inArray, sql } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import { GROUP_THEMES, THEME_NAMES } from '../src/lib/themes'
import { generateGroupPassword, allocateLoginCodes } from '../src/lib/credentials'

// Adds one more team to a launched class, using the programme's own settings
// and the same uniqueness rules as the launch. The class's headcount grows by
// the team size. Dry run unless --confirm is passed.
//
//   npx tsx --env-file=.env.local scripts/add-team.ts <classId> [size] [--confirm]

async function main() {
  const args = process.argv.slice(2)
  const confirm = args.includes('--confirm')
  const nums = args.filter(a => /^\d+$/.test(a)).map(Number)
  const classId = nums[0]
  const size = nums[1] ?? 5
  if (!classId) throw new Error('Pass a class id.')

  const [klass] = await db.select().from(classes).where(eq(classes.id, classId))
  if (!klass) throw new Error(`No class ${classId}`)
  const [programme] = await db.select().from(programmes).where(eq(programmes.id, klass.programmeId))
  const [competition] = await db.select().from(competitions)
    .where(and(eq(competitions.classId, classId), eq(competitions.round, 1)))
  if (!competition) throw new Error('That class has not been launched.')

  const existingGroups = await db.select().from(groups).where(eq(groups.competitionId, competition.id))
  const existingTeams = existingGroups.length

  // Each class owns a block of themes, one per team slot.
  const usedThemes = new Set(existingGroups.map(g => g.name))
  let theme: string | undefined
  for (let i = existingTeams; i < existingTeams + 8; i++) {
    const candidate = THEME_NAMES[(klass.themeOffset + i) % THEME_NAMES.length]
    if (!usedThemes.has(candidate)) { theme = candidate; break }
  }
  if (!theme) throw new Error('No free team theme in this class.')

  // Unique across the whole programme: the code is the entire login.
  const progComps = await db.select({ id: competitions.id }).from(competitions).where(eq(competitions.programmeId, programme.id))
  const progGroups = await db.select({ pw: groups.groupPassword }).from(groups).where(inArray(groups.competitionId, progComps.map(c => c.id)))
  const progCodes = await db.select({ code: participants.loginCode }).from(participants).where(eq(participants.programmeId, programme.id))

  const password = generateGroupPassword(progGroups.map(g => g.pw))
  const usedCodes = new Set(progCodes.map(p => p.code))
  const spareCodes = [...new Set(THEME_NAMES.flatMap(t => GROUP_THEMES[t]))]
  const codes = allocateLoginCodes(GROUP_THEMES[theme], size, usedCodes, spareCodes)

  const capital = competition.initialBalance
  const personal = competition.personalStartingBalance

  console.log(`Class ${klass.name} (#${klass.id}), competition #${competition.id}`)
  console.log(`  new team "${theme}" · ${size} students · capital ${capital} · personal ${personal}`)
  console.log(`  logins: ${codes.join(', ')}`)
  console.log(`  headcount ${klass.headcount} -> ${klass.headcount + size}, teams ${existingTeams} -> ${existingTeams + 1}`)
  if (!confirm) { console.log('\nDry run. Re-run with --confirm to apply.'); process.exit(0) }

  const hash = await bcrypt.hash(password, 10)
  const [team] = await db.insert(teams).values({ classId: klass.id, name: theme }).returning({ id: teams.id })
  const [group] = await db.insert(groups).values({
    competitionId: competition.id, name: theme, balance: capital, startingCapital: capital,
    groupPassword: password, groupPasswordHash: hash, teamId: team.id,
  }).returning({ id: groups.id })
  const parts = await db.insert(participants).values(codes.map(code => ({
    programmeId: programme.id, classId: klass.id, teamId: team.id, loginCode: code, passwordHash: hash,
  }))).returning({ id: participants.id, loginCode: participants.loginCode })
  const partByCode = new Map(parts.map(p => [p.loginCode, p.id]))
  await db.insert(students).values(codes.map(code => ({
    groupId: group.id, loginCode: code, passwordHash: hash, personalBalance: personal, participantId: partByCode.get(code)!,
  })))
  await db.update(classes).set({ headcount: sql`${classes.headcount} + ${size}` }).where(eq(classes.id, klass.id))

  console.log(`\nAdded team "${theme}" (group #${group.id}). Password: ${password}`)
  process.exit(0)
}

main()
