import { and, desc, eq, inArray, sql } from 'drizzle-orm'
import { db } from '@/db'
import { transfers, groups, students, competitions } from '@/db/schema'
import { teacherIsAdmin } from '@/lib/authz'

export type StorePayment = {
  id: number
  amount: number
  message: string | null
  when: string
  team: string
  teamId: number
  competition: string
  /** Student login for payments in; empty for payouts. */
  paidBy: string
}

export type StoreTeam = { id: number; name: string; competition: string }

export type StoreLedger = {
  /** What the store held before any of these payments. */
  opening: number
  received: StorePayment[]
  sent: StorePayment[]
  teams: StoreTeam[]
}

const formatWhen = (d: Date) =>
  new Date(d).toLocaleString('en-SG', {
    timeZone: 'Asia/Singapore', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })

/** MAIN STORE starts every class hackathon (and standalone competition) with this many WizCoins. */
export const STORE_BASELINE = 100

async function flows(competitionIds: number[]): Promise<number> {
  if (competitionIds.length === 0) return 0
  const [[received], [sent]] = await Promise.all([
    db.select({ n: sql<number>`coalesce(sum(${transfers.amount}), 0)::int` })
      .from(transfers)
      .innerJoin(groups, eq(groups.id, transfers.fromGroupId))
      .where(and(eq(transfers.toStore, true), inArray(groups.competitionId, competitionIds))),
    db.select({ n: sql<number>`coalesce(sum(${transfers.amount}), 0)::int` })
      .from(transfers)
      .innerJoin(groups, eq(groups.id, transfers.toGroupId))
      .where(and(eq(transfers.fromStore, true), inArray(groups.competitionId, competitionIds))),
  ])
  return received.n - sent.n
}

async function programmeCompetitions(programmeId: number) {
  return db.select({ id: competitions.id, round: competitions.round }).from(competitions).where(eq(competitions.programmeId, programmeId))
}

/**
 * A programme's store holds the baseline for each of its classes (the final
 * adds none), so it scales with the number of classes.
 */
function programmeOpening(comps: { round: number }[]): number {
  return STORE_BASELINE * comps.filter(c => c.round === 1).length
}

/**
 * The most MAIN STORE can pay this team right now. A class hackathon or
 * standalone competition is limited by its own store, a programme by its pool,
 * and the final draws on the programme pool alone.
 */
export async function storeLimitForGroup(groupId: number): Promise<number> {
  const [row] = await db
    .select({ competitionId: competitions.id, programmeId: competitions.programmeId, round: competitions.round })
    .from(groups)
    .innerJoin(competitions, eq(competitions.id, groups.competitionId))
    .where(eq(groups.id, groupId))
  if (!row) return 0

  const limits: number[] = []
  if (row.programmeId === null || row.round === 1) limits.push(STORE_BASELINE + (await flows([row.competitionId])))
  if (row.programmeId !== null) {
    const comps = await programmeCompetitions(row.programmeId)
    limits.push(programmeOpening(comps) + (await flows(comps.map(c => c.id))))
  }
  return Math.min(...limits)
}

/**
 * MAIN STORE's books for the given competitions: what teams paid in, what the
 * store paid out, and the teams it could pay. The Main Store wallet is an admin
 * concern, so anyone else gets null and nothing is read.
 */
export async function loadStoreLedger(
  teacherId: number,
  scope: { competitionId: number } | { programmeId: number }
): Promise<StoreLedger | null> {
  if (!(await teacherIsAdmin(teacherId))) return null

  let competitionIds: number[]
  let opening: number
  if ('programmeId' in scope) {
    const comps = await programmeCompetitions(scope.programmeId)
    competitionIds = comps.map(c => c.id)
    opening = programmeOpening(comps)
  } else {
    const [c] = await db.select({ id: competitions.id, programmeId: competitions.programmeId, round: competitions.round })
      .from(competitions).where(eq(competitions.id, scope.competitionId))
    if (!c) return { opening: 0, received: [], sent: [], teams: [] }
    competitionIds = [c.id]
    if (c.programmeId === null || c.round === 1) {
      opening = STORE_BASELINE
    } else {
      // The final shares the programme pool: what the classes left in it.
      const comps = await programmeCompetitions(c.programmeId)
      const classIds = comps.filter(x => x.round !== c.round).map(x => x.id)
      opening = programmeOpening(comps) + (await flows(classIds))
    }
  }
  if (competitionIds.length === 0) return { opening, received: [], sent: [], teams: [] }

  const [receivedRows, sentRows, teamRows] = await Promise.all([
    db
      .select({
        id: transfers.id, amount: transfers.amount, message: transfers.message, createdAt: transfers.createdAt,
        team: groups.name, teamId: groups.id, competition: competitions.name, paidBy: students.loginCode,
      })
      .from(transfers)
      .innerJoin(groups, eq(groups.id, transfers.fromGroupId))
      .innerJoin(competitions, eq(competitions.id, groups.competitionId))
      .innerJoin(students, eq(students.id, transfers.sentByStudentId))
      .where(and(eq(transfers.toStore, true), inArray(groups.competitionId, competitionIds)))
      .orderBy(desc(transfers.createdAt)),
    db
      .select({
        id: transfers.id, amount: transfers.amount, message: transfers.message, createdAt: transfers.createdAt,
        team: groups.name, teamId: groups.id, competition: competitions.name,
      })
      .from(transfers)
      .innerJoin(groups, eq(groups.id, transfers.toGroupId))
      .innerJoin(competitions, eq(competitions.id, groups.competitionId))
      .where(and(eq(transfers.fromStore, true), inArray(groups.competitionId, competitionIds)))
      .orderBy(desc(transfers.createdAt)),
    db
      .select({ id: groups.id, name: groups.name, competition: competitions.name })
      .from(groups)
      .innerJoin(competitions, eq(competitions.id, groups.competitionId))
      .where(and(eq(groups.kind, 'team'), inArray(groups.competitionId, competitionIds)))
      .orderBy(competitions.id, groups.id),
  ])

  return {
    opening,
    received: receivedRows.map(({ createdAt, ...r }) => ({ ...r, when: formatWhen(createdAt) })),
    sent: sentRows.map(({ createdAt, ...r }) => ({ ...r, paidBy: '', when: formatWhen(createdAt) })),
    teams: teamRows.map(t => ({ id: t.id, name: t.name, competition: t.competition })),
  }
}
