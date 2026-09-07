import { db } from '../src/db/index'
import {
  competitions, groups, students, listings, transfers, transactions, competitionOrganizers,
} from '../src/db/schema'
import { inArray, or } from 'drizzle-orm'

// Usage:
//   npx tsx --env-file=.env.local scripts/delete-competitions.ts 8 10          (dry run)
//   npx tsx --env-file=.env.local scripts/delete-competitions.ts 8 10 --confirm
//
// Irreversible. Dry run by default: it reports exactly what would go and exits.

async function main() {
  const args = process.argv.slice(2)
  const confirm = args.includes('--confirm')
  const ids = args.filter(a => /^\d+$/.test(a)).map(Number)

  if (ids.length === 0) {
    console.error('Pass one or more competition ids.')
    process.exit(1)
  }

  const comps = await db
    .select({ id: competitions.id, name: competitions.name, programmeId: competitions.programmeId })
    .from(competitions)
    .where(inArray(competitions.id, ids))

  const missing = ids.filter(id => !comps.some(c => c.id === id))
  if (missing.length > 0) {
    console.error(`No such competition: ${missing.join(', ')}`)
    process.exit(1)
  }

  const groupRows = await db.select({ id: groups.id }).from(groups).where(inArray(groups.competitionId, ids))
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
  const orgRows = await db.select({ id: competitionOrganizers.id })
    .from(competitionOrganizers)
    .where(inArray(competitionOrganizers.competitionId, ids))

  console.log('Would delete:\n')
  for (const c of comps) {
    console.log(`  #${c.id}  ${c.name}${c.programmeId ? '  (part of a programme!)' : ''}`)
  }
  console.log(`\n  transactions          ${txRows.length}`)
  console.log(`  transfers             ${transferRows.length}`)
  console.log(`  listings              ${listingRows.length}`)
  console.log(`  students              ${studentRows.length}`)
  console.log(`  groups                ${groupIds.length}`)
  console.log(`  co-organiser links    ${orgRows.length}`)
  console.log(`  competitions          ${comps.length}`)

  if (!confirm) {
    console.log('\nDry run. Re-run with --confirm to apply. This cannot be undone.')
    process.exit(0)
  }

  // Children first, so foreign keys never block the delete.
  if (txRows.length) await db.delete(transactions).where(inArray(transactions.id, txRows.map(r => r.id)))
  if (transferRows.length) await db.delete(transfers).where(inArray(transfers.id, transferRows.map(r => r.id)))
  if (listingRows.length) await db.delete(listings).where(inArray(listings.id, listingRows.map(r => r.id)))
  if (studentRows.length) await db.delete(students).where(inArray(students.id, studentRows.map(r => r.id)))
  if (groupIds.length) await db.delete(groups).where(inArray(groups.id, groupIds))
  if (orgRows.length) await db.delete(competitionOrganizers).where(inArray(competitionOrganizers.id, orgRows.map(r => r.id)))
  await db.delete(competitions).where(inArray(competitions.id, ids))

  console.log('\nDeleted.')
  process.exit(0)
}

main()
