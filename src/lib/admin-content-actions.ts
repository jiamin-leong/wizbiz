'use server'

import { db } from '@/db'
import {
  programmes, classes, teams, participants, invites, competitions, groups, students, listings,
  transfers, transactions, competitionOrganizers,
} from '@/db/schema'
import { eq, inArray, or } from 'drizzle-orm'
import { requireTeacher, teacherIsAdmin } from '@/lib/authz'

type Result = { error?: string; success?: boolean }
type Statement = Parameters<typeof db.batch>[0][number]

async function adminOnly(): Promise<Result | null> {
  const session = await requireTeacher()
  return (await teacherIsAdmin(session.id)) ? null : { error: 'Only admins can do that.' }
}

/** Everything hanging off these competitions, children first so foreign keys never block. */
async function competitionDeletes(competitionIds: number[]): Promise<Statement[]> {
  if (competitionIds.length === 0) return []

  const groupIds = (await db.select({ id: groups.id }).from(groups).where(inArray(groups.competitionId, competitionIds))).map(g => g.id)
  const statements: Statement[] = []

  if (groupIds.length > 0) {
    statements.push(
      db.delete(transactions).where(or(inArray(transactions.buyerGroupId, groupIds), inArray(transactions.sellerGroupId, groupIds))),
      db.delete(transfers).where(or(inArray(transfers.fromGroupId, groupIds), inArray(transfers.toGroupId, groupIds))),
      db.delete(listings).where(inArray(listings.groupId, groupIds)),
      db.delete(students).where(inArray(students.groupId, groupIds)),
      db.delete(groups).where(inArray(groups.id, groupIds)),
    )
  }
  statements.push(
    db.delete(competitionOrganizers).where(inArray(competitionOrganizers.competitionId, competitionIds)),
    db.delete(competitions).where(inArray(competitions.id, competitionIds)),
  )
  return statements
}

export async function renameProgramme(programmeId: number, name: string): Promise<Result> {
  const denied = await adminOnly()
  if (denied) return denied
  const trimmed = name.trim()
  if (!trimmed) return { error: 'Give the programme a name.' }

  await db.update(programmes).set({ name: trimmed }).where(eq(programmes.id, programmeId))
  return { success: true }
}

/** Permanently deletes a standalone competition with its teams, students and transactions. */
export async function deleteCompetition(competitionId: number): Promise<Result> {
  const denied = await adminOnly()
  if (denied) return denied

  const [competition] = await db.select({ programmeId: competitions.programmeId }).from(competitions).where(eq(competitions.id, competitionId))
  if (!competition) return { error: 'Competition not found.' }
  if (competition.programmeId !== null) return { error: 'Class hackathons are deleted with their programme.' }

  await db.batch((await competitionDeletes([competitionId])) as [Statement, ...Statement[]])
  return { success: true }
}

/** Permanently deletes a programme: its classes, every round's competition, teams and students. */
export async function deleteProgramme(programmeId: number): Promise<Result> {
  const denied = await adminOnly()
  if (denied) return denied

  const [programme] = await db.select({ id: programmes.id }).from(programmes).where(eq(programmes.id, programmeId))
  if (!programme) return { error: 'Programme not found.' }

  const competitionIds = (await db.select({ id: competitions.id }).from(competitions).where(eq(competitions.programmeId, programmeId))).map(c => c.id)
  const classIds = (await db.select({ id: classes.id }).from(classes).where(eq(classes.programmeId, programmeId))).map(c => c.id)

  const statements: Statement[] = [
    ...(await competitionDeletes(competitionIds)),
    db.delete(participants).where(eq(participants.programmeId, programmeId)),
  ]
  if (classIds.length > 0) {
    statements.push(
      db.delete(teams).where(inArray(teams.classId, classIds)),
      db.delete(invites).where(inArray(invites.classId, classIds)),
      db.delete(classes).where(inArray(classes.id, classIds)),
    )
  }
  statements.push(db.delete(programmes).where(eq(programmes.id, programmeId)))

  await db.batch(statements as [Statement, ...Statement[]])
  return { success: true }
}
