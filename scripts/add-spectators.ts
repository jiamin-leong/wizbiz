import { db } from '../src/db/index'
import { competitions, groups, students } from '../src/db/schema'
import { eq, and, inArray } from 'drizzle-orm'

// Adds non-finalist students to an existing round 2 as spectators: same team
// name, same login code, same password, personal wallet carried forward — but
// a zeroed business wallet, so a knocked-out team cannot bankroll a finalist.
//
//   npx tsx --env-file=.env.local scripts/add-spectators.ts 1 [--confirm]

const PROGRAMME_ID = Number(process.argv[2]) || 1
const CONFIRM = process.argv.includes('--confirm')

async function main() {
  const [master] = await db
    .select({ id: competitions.id, name: competitions.name })
    .from(competitions)
    .where(and(eq(competitions.programmeId, PROGRAMME_ID), eq(competitions.round, 2)))
  if (!master) throw new Error('No round 2 for this programme yet.')

  const existing = await db
    .select({ id: groups.id })
    .from(groups)
    .where(and(eq(groups.competitionId, master.id), eq(groups.kind, 'spectators')))
  if (existing.length > 0) {
    console.log(`"${master.name}" already has ${existing.length} spectator teams. Nothing to do.`)
    process.exit(0)
  }

  const round1 = await db
    .select({ id: competitions.id })
    .from(competitions)
    .where(and(eq(competitions.programmeId, PROGRAMME_ID), eq(competitions.round, 1)))
  const round1Ids = round1.map(c => c.id)

  const others = await db
    .select({
      id: groups.id, name: groups.name, teamId: groups.teamId,
      groupPassword: groups.groupPassword, groupPasswordHash: groups.groupPasswordHash,
    })
    .from(groups)
    .where(and(
      inArray(groups.competitionId, round1Ids),
      eq(groups.qualified, false),
      eq(groups.kind, 'team'),
    ))

  const members = await db
    .select({
      id: students.id, groupId: students.groupId, loginCode: students.loginCode,
      passwordHash: students.passwordHash, participantId: students.participantId,
      personalBalance: students.personalBalance,
    })
    .from(students)
    .where(inArray(students.groupId, others.map(o => o.id)))

  console.log(`Would add ${others.length} spectator teams (${members.length} students) to "${master.name}".`)
  if (!CONFIRM) {
    console.log('Dry run. Re-run with --confirm to apply.')
    process.exit(0)
  }

  const createdGroups = await db
    .insert(groups)
    .values(others.map(o => ({
      competitionId: master.id,
      name: o.name,
      balance: 0,
      startingCapital: 0,
      groupPassword: o.groupPassword,
      groupPasswordHash: o.groupPasswordHash,
      teamId: o.teamId,
      kind: 'spectators' as const,
    })))
    .returning({ id: groups.id, name: groups.name })

  // Team names are unique across the programme, so name identifies the group.
  const newGroupByName = new Map(createdGroups.map(g => [g.name, g.id]))
  const sourceNameById = new Map(others.map(o => [o.id, o.name]))

  await db.insert(students).values(
    members.map(m => ({
      groupId: newGroupByName.get(sourceNameById.get(m.groupId)!)!,
      loginCode: m.loginCode,
      passwordHash: m.passwordHash,
      personalBalance: m.personalBalance,
      participantId: m.participantId,
    }))
  )

  console.log(`Added ${createdGroups.length} spectator teams and ${members.length} students.`)
  process.exit(0)
}

main()
