import { db } from '../src/db/index'
import {
  competitions, groups, students, listings, transfers, transactions,
  competitionOrganizers, participants, teams, classes,
} from '../src/db/schema'
import { eq, and, inArray, or } from 'drizzle-orm'

// Removes a programme's launched round(s) — competitions, groups, students,
// participants and teams — while keeping the programme and its classes, so it
// can be launched again. Dry run unless --confirm is passed.
//
//   npx tsx --env-file=.env.local scripts/reset-round.ts 1 --round 1 --confirm

async function main() {
  const args = process.argv.slice(2)
  const confirm = args.includes('--confirm')
  const programmeId = Number(args.find(a => /^\d+$/.test(a)))
  const roundArg = args.indexOf('--round')
  const round = roundArg >= 0 ? Number(args[roundArg + 1]) : null

  if (!programmeId) {
    console.error('Pass a programme id.')
    process.exit(1)
  }

  const comps = await db
    .select({ id: competitions.id, name: competitions.name, round: competitions.round })
    .from(competitions)
    .where(round
      ? and(eq(competitions.programmeId, programmeId), eq(competitions.round, round))
      : eq(competitions.programmeId, programmeId))
  const compIds = comps.map(c => c.id)

  const classRows = await db.select({ id: classes.id }).from(classes).where(eq(classes.programmeId, programmeId))
  const classIds = classRows.map(c => c.id)

  const groupRows = compIds.length
    ? await db.select({ id: groups.id }).from(groups).where(inArray(groups.competitionId, compIds))
    : []
  const groupIds = groupRows.map(g => g.id)

  const studentRows = groupIds.length
    ? await db.select({ id: students.id }).from(students).where(inArray(students.groupId, groupIds))
    : []
  const listingRows = groupIds.length
    ? await db.select({ id: listings.id }).from(listings).where(inArray(listings.groupId, groupIds))
    : []
  const transferRows = groupIds.length
    ? await db.select({ id: transfers.id }).from(transfers)
        .where(or(inArray(transfers.fromGroupId, groupIds), inArray(transfers.toGroupId, groupIds)))
    : []
  const txRows = groupIds.length
    ? await db.select({ id: transactions.id }).from(transactions)
        .where(or(inArray(transactions.buyerGroupId, groupIds), inArray(transactions.sellerGroupId, groupIds)))
    : []
  const partRows = await db.select({ id: participants.id }).from(participants).where(eq(participants.programmeId, programmeId))
  const teamRows = classIds.length
    ? await db.select({ id: teams.id }).from(teams).where(inArray(teams.classId, classIds))
    : []
  const orgRows = compIds.length
    ? await db.select({ id: competitionOrganizers.id }).from(competitionOrganizers).where(inArray(competitionOrganizers.competitionId, compIds))
    : []

  console.log(`Programme ${programmeId}${round ? `, round ${round}` : ', all rounds'} — would delete:\n`)
  for (const c of comps) console.log(`  #${c.id}  ${c.name} (round ${c.round})`)
  console.log(`\n  transactions        ${txRows.length}`)
  console.log(`  transfers           ${transferRows.length}`)
  console.log(`  listings            ${listingRows.length}`)
  console.log(`  students            ${studentRows.length}`)
  console.log(`  groups              ${groupIds.length}`)
  console.log(`  participants        ${partRows.length}`)
  console.log(`  teams               ${teamRows.length}`)
  console.log(`  co-organiser links  ${orgRows.length}`)
  console.log(`  competitions        ${comps.length}`)
  console.log('\n  kept: the programme and its classes')

  if (!confirm) {
    console.log('\nDry run. Re-run with --confirm to apply.')
    process.exit(0)
  }

  if (txRows.length) await db.delete(transactions).where(inArray(transactions.id, txRows.map(r => r.id)))
  if (transferRows.length) await db.delete(transfers).where(inArray(transfers.id, transferRows.map(r => r.id)))
  if (listingRows.length) await db.delete(listings).where(inArray(listings.id, listingRows.map(r => r.id)))
  if (studentRows.length) await db.delete(students).where(inArray(students.id, studentRows.map(r => r.id)))
  if (groupIds.length) await db.delete(groups).where(inArray(groups.id, groupIds))
  if (partRows.length) await db.delete(participants).where(inArray(participants.id, partRows.map(r => r.id)))
  if (teamRows.length) await db.delete(teams).where(inArray(teams.id, teamRows.map(r => r.id)))
  if (orgRows.length) await db.delete(competitionOrganizers).where(inArray(competitionOrganizers.id, orgRows.map(r => r.id)))
  if (compIds.length) await db.delete(competitions).where(inArray(competitions.id, compIds))

  console.log('\nReset. The programme and its classes are ready to launch again.')
  process.exit(0)
}

main()
