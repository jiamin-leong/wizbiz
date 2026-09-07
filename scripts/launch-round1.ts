import { db } from '../src/db/index'
import { programmes, classes, competitions, groups, students, teams, participants } from '../src/db/schema'
import { eq, and, inArray, sql } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import { GROUP_THEMES, THEME_NAMES } from '../src/lib/themes'
import { generateGroupPasswords, allocateLoginCodes } from '../src/lib/credentials'
import { allocateGroups } from '../src/lib/allocation'

// Mirrors launchRound1 in src/lib/programme-actions.ts, for launching from the
// command line. Same batched inserts.
const PROGRAMME_ID = Number(process.argv[2]) || 1

async function main() {
  const t0 = Date.now()

  const [programme] = await db.select().from(programmes).where(eq(programmes.id, PROGRAMME_ID))
  if (!programme) throw new Error(`No programme ${PROGRAMME_ID}`)

  // Settings live on the programme now.
  const START_DATE = programme.startDate ?? new Date()
  const END_DATE = programme.endDate ?? new Date()
  const GROUP_CAPITAL = programme.groupCapital ?? 1000
  const PERSONAL_STARTING_BALANCE = programme.personalStartingBalance ?? 50

  const already = await db.select({ id: competitions.id }).from(competitions)
    .where(and(eq(competitions.programmeId, PROGRAMME_ID), eq(competitions.round, 1)))
  if (already.length > 0) throw new Error('Round 1 already launched — reset it first.')

  const classRows = await db.select().from(classes).where(eq(classes.programmeId, PROGRAMME_ID)).orderBy(classes.id)

  // Same uniqueness rules as the app: one-word codes unique across the
  // programme, and a distinct password per team.
  const teamCount = classRows.reduce((n, k) => n + allocateGroups(k.headcount).length, 0)
  const passwords = generateGroupPasswords(teamCount)
  const usedCodes = new Set<string>()
  const spareCodes = [...new Set(THEME_NAMES.flatMap(t => GROUP_THEMES[t]))]
  let pi = 0

  const plan = classRows.map(klass => ({
    klass,
    teamPlans: allocateGroups(klass.headcount).map((size, i) => {
      const theme = THEME_NAMES[(klass.themeOffset + i) % THEME_NAMES.length]
      return {
        theme, size,
        password: passwords[pi++],
        items: allocateLoginCodes(GROUP_THEMES[theme], size, usedCodes, spareCodes),
      }
    }),
  }))

  const allTeamPlans = plan.flatMap(p => p.teamPlans)
  const hashes = await Promise.all(allTeamPlans.map(t => bcrypt.hash(t.password, 10)))
  const hashByPassword = new Map(allTeamPlans.map((t, i) => [t.password, hashes[i]]))

  const createdCompetitions = await db.insert(competitions).values(
    plan.map(({ klass }) => ({
      teacherId: klass.teacherId ?? programme.ownerTeacherId,
      name: klass.name, startDate: START_DATE, endDate: END_DATE,
      initialBalance: GROUP_CAPITAL, personalStartingBalance: PERSONAL_STARTING_BALANCE,
      status: 'active' as const, programmeId: PROGRAMME_ID, classId: klass.id, round: 1,
    }))
  ).returning({ id: competitions.id, classId: competitions.classId })
  const competitionByClass = new Map(createdCompetitions.map(c => [c.classId, c.id]))

  const createdTeams = await db.insert(teams).values(
    plan.flatMap(({ klass, teamPlans }) => teamPlans.map(t => ({ classId: klass.id, name: t.theme })))
  ).returning({ id: teams.id, classId: teams.classId, name: teams.name })
  const teamIdByKey = new Map(createdTeams.map(t => [`${t.classId}:${t.name}`, t.id]))

  const createdGroups = await db.insert(groups).values(
    plan.flatMap(({ klass, teamPlans }) => teamPlans.map(t => ({
      competitionId: competitionByClass.get(klass.id)!, name: t.theme,
      balance: GROUP_CAPITAL, startingCapital: GROUP_CAPITAL,
      groupPassword: t.password, groupPasswordHash: hashByPassword.get(t.password)!,
      teamId: teamIdByKey.get(`${klass.id}:${t.theme}`)!,
    })))
  ).returning({ id: groups.id, competitionId: groups.competitionId, name: groups.name })
  const groupIdByKey = new Map(createdGroups.map(g => [`${g.competitionId}:${g.name}`, g.id]))

  const createdParticipants = await db.insert(participants).values(
    plan.flatMap(({ klass, teamPlans }) => teamPlans.flatMap(t => t.items.map(item => ({
      programmeId: PROGRAMME_ID, classId: klass.id,
      teamId: teamIdByKey.get(`${klass.id}:${t.theme}`)!,
      loginCode: item,
      passwordHash: hashByPassword.get(t.password)!,
    }))))
  ).returning({ id: participants.id, loginCode: participants.loginCode })
  const participantIdByCode = new Map(createdParticipants.map(p => [p.loginCode, p.id]))

  await db.insert(students).values(
    plan.flatMap(({ klass, teamPlans }) => teamPlans.flatMap(t => t.items.map(item => {
      const loginCode = item
      return {
        groupId: groupIdByKey.get(`${competitionByClass.get(klass.id)!}:${t.theme}`)!,
        loginCode, passwordHash: hashByPassword.get(t.password)!,
        personalBalance: PERSONAL_STARTING_BALANCE,
        participantId: participantIdByCode.get(loginCode)!,
      }
    })))
  )

  const compIds = createdCompetitions.map(c => c.id)
  const studentCount = (await db.select({ c: sql<number>`count(*)::int` })
    .from(students)
    .innerJoin(groups, eq(groups.id, students.groupId))
    .where(inArray(groups.competitionId, compIds)))[0].c

  console.log(`Launched round 1 in ${((Date.now() - t0) / 1000).toFixed(1)}s`)
  console.log(`  ${createdCompetitions.length} class hackathons`)
  console.log(`  ${createdTeams.length} teams`)
  console.log(`  ${createdParticipants.length} participants`)
  console.log(`  ${studentCount} students`)
  process.exit(0)
}

main()
