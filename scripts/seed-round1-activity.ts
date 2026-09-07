import { db } from '../src/db/index'
import { competitions, groups, students, transfers } from '../src/db/schema'
import { eq, and, inArray, sql } from 'drizzle-orm'
import { computeStatements, rankStatements, ADVANCING_PER_CLASS } from '../src/lib/standings'

// Generates plausible round 1 trading for every class in a programme, then
// confirms each class's top 3 so round 2 can be created.
//
//   npx tsx --env-file=.env.local scripts/seed-round1-activity.ts 1
//
// Uses direct payments (the `transfers` table), which is what the business
// statements read. Balances are kept in step with every payment written, so
// cash on hand always reconciles with revenue minus expenses.

const PROGRAMME_ID = Number(process.argv[2]) || 1

// Deterministic, so re-running after a reset reproduces the same league table.
let seed = 20261006
function rnd() {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff
  return seed / 0x7fffffff
}
const pick = <T>(arr: T[]): T => arr[Math.floor(rnd() * arr.length)]
const between = (lo: number, hi: number) => lo + Math.floor(rnd() * (hi - lo + 1))

type NewTransfer = {
  fromGroupId: number
  toGroupId: number | null
  toStore: boolean
  fromPersonal: boolean
  sentByStudentId: number
  amount: number
  message: string | null
}

async function main() {
  const comps = await db
    .select({ id: competitions.id, name: competitions.name })
    .from(competitions)
    .where(and(eq(competitions.programmeId, PROGRAMME_ID), eq(competitions.round, 1)))
    .orderBy(competitions.id)

  if (comps.length === 0) throw new Error(`No round 1 competitions for programme ${PROGRAMME_ID}`)

  const allTransfers: NewTransfer[] = []
  const groupBalance = new Map<number, number>()
  const studentPersonal = new Map<number, number>()

  for (const comp of comps) {
    const groupRows = await db
      .select({ id: groups.id, name: groups.name, balance: groups.balance, startingCapital: groups.startingCapital })
      .from(groups)
      .where(and(eq(groups.competitionId, comp.id), eq(groups.kind, 'team')))
      .orderBy(groups.id)

    const studentRows = await db
      .select({ id: students.id, groupId: students.groupId, personalBalance: students.personalBalance })
      .from(students)
      .where(inArray(students.groupId, groupRows.map(g => g.id)))

    for (const g of groupRows) groupBalance.set(g.id, g.balance)
    for (const s of studentRows) studentPersonal.set(s.id, s.personalBalance)

    const ids = groupRows.map(g => g.id)
    const memberOf = new Map<number, typeof studentRows>()
    for (const g of groupRows) memberOf.set(g.id, studentRows.filter(s => s.groupId === g.id))

    // Give each team a hidden "trading strength" so the league table has a real
    // spread rather than everyone landing on the same number.
    const strength = new Map(ids.map(id => [id, 0.35 + rnd() * 1.3]))

    // 1. Students spend their personal wallets with other teams. This is the
    //    only new money entering the class economy.
    for (const s of studentRows) {
      const trips = between(1, 3)
      for (let t = 0; t < trips; t++) {
        const others = ids.filter(id => id !== s.groupId)
        // Stronger teams attract more custom.
        const target = others.reduce((best, id) =>
          rnd() * strength.get(id)! > rnd() * strength.get(best)! ? id : best, pick(others))
        const wallet = studentPersonal.get(s.id)!
        if (wallet < 5) break
        const amount = Math.min(wallet, between(5, 25))
        studentPersonal.set(s.id, wallet - amount)
        groupBalance.set(target, groupBalance.get(target)! + amount)
        allTransfers.push({
          fromGroupId: s.groupId, toGroupId: target, toStore: false, fromPersonal: true,
          sentByStudentId: s.id, amount, message: null,
        })
      }
    }

    // 2. Teams buy supplies from each other (business to business, nets to zero
    //    across the class but reshuffles who holds the cash).
    for (const g of groupRows) {
      const buys = between(0, 2)
      for (let b = 0; b < buys; b++) {
        const target = pick(ids.filter(id => id !== g.id))
        const bal = groupBalance.get(g.id)!
        const amount = Math.min(Math.max(bal - 200, 0), between(20, 120))
        if (amount < 20) continue
        groupBalance.set(g.id, bal - amount)
        groupBalance.set(target, groupBalance.get(target)! + amount)
        allTransfers.push({
          fromGroupId: g.id, toGroupId: target, toStore: false, fromPersonal: false,
          sentByStudentId: memberOf.get(g.id)![0].id, amount, message: 'Supplies',
        })
      }
    }

    // 3. Running costs paid to MAIN STORE — real money out of the class economy,
    //    scaled inversely to strength so weaker teams end up further behind.
    for (const g of groupRows) {
      const bal = groupBalance.get(g.id)!
      const spend = Math.round(between(80, 260) / strength.get(g.id)!)
      const amount = Math.min(Math.max(bal - 100, 0), spend)
      if (amount < 10) continue
      groupBalance.set(g.id, bal - amount)
      allTransfers.push({
        fromGroupId: g.id, toGroupId: null, toStore: true, fromPersonal: false,
        sentByStudentId: memberOf.get(g.id)![0].id, amount, message: 'Stall rental',
      })
    }
  }

  // ── write it all in a handful of statements ──
  await db.insert(transfers).values(allTransfers)

  const groupValues = [...groupBalance.entries()].map(([id, bal]) => `(${id}, ${bal})`).join(',')
  await db.execute(sql.raw(
    `UPDATE "groups" SET "balance" = v.bal FROM (VALUES ${groupValues}) AS v(id, bal) WHERE "groups"."id" = v.id`
  ))

  const studentValues = [...studentPersonal.entries()].map(([id, bal]) => `(${id}, ${bal})`).join(',')
  await db.execute(sql.raw(
    `UPDATE "students" SET "personal_balance" = v.bal FROM (VALUES ${studentValues}) AS v(id, bal) WHERE "students"."id" = v.id`
  ))

  console.log(`Wrote ${allTransfers.length} payments across ${comps.length} classes.\n`)

  // ── confirm each class's top 3 ──
  for (const comp of comps) {
    const groupRows = await db
      .select({
        id: groups.id, name: groups.name, balance: groups.balance, teamId: groups.teamId,
        startingCapital: groups.startingCapital, qualified: groups.qualified, qualifiedRank: groups.qualifiedRank,
      })
      .from(groups)
      .where(and(eq(groups.competitionId, comp.id), eq(groups.kind, 'team')))

    const ids = groupRows.map(g => g.id)
    const studentRows = await db.select({ groupId: students.groupId }).from(students).where(inArray(students.groupId, ids))
    const transferRows = await db
      .select({
        fromGroupId: transfers.fromGroupId, toGroupId: transfers.toGroupId,
        toStore: transfers.toStore, fromPersonal: transfers.fromPersonal, amount: transfers.amount,
      })
      .from(transfers)
      .where(inArray(transfers.fromGroupId, ids))

    const ranked = rankStatements(computeStatements({
      groups: groupRows, students: studentRows, transfers: transferRows, fallbackStartingCapital: 1000,
    }))
    const top = ranked.slice(0, ADVANCING_PER_CLASS)

    const caseSql = top.map((s, i) => `WHEN ${s.groupId} THEN ${i + 1}`).join(' ')
    await db.execute(sql.raw(
      `UPDATE "groups" SET "qualified" = true, "qualified_rank" = CASE "id" ${caseSql} END
       WHERE "id" IN (${top.map(s => s.groupId).join(',')})`
    ))

    console.log(`${comp.name.padEnd(20)} ${top.map((s, i) => `${i + 1}. ${s.name} (${s.profitLoss >= 0 ? '+' : ''}${s.profitLoss})`).join('   ')}`)
  }

  console.log(`\nAll ${comps.length} classes confirmed — ${comps.length * ADVANCING_PER_CLASS} finalists ready.`)
  process.exit(0)
}

main()
