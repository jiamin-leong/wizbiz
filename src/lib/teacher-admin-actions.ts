'use server'

import { db } from '@/db'
import {
  teachers, competitions, programmes, classes, competitionOrganizers, invites, loginTokens,
} from '@/db/schema'
import { eq, and, ne, sql } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import { revalidatePath } from 'next/cache'
import { requireAdmin, currentAdminTeacherId } from '@/lib/admin-auth'

/** What would break if this teacher were removed. */
export type Blockers = {
  competitions: number
  programmes: number
  classes: number
}

async function blockersFor(teacherId: number): Promise<Blockers> {
  const count = async (q: Promise<{ n: number }[]>) => (await q)[0]?.n ?? 0
  const [comps, progs, klasses] = await Promise.all([
    count(db.select({ n: sql<number>`count(*)::int` }).from(competitions).where(eq(competitions.teacherId, teacherId))),
    count(db.select({ n: sql<number>`count(*)::int` }).from(programmes).where(eq(programmes.ownerTeacherId, teacherId))),
    count(db.select({ n: sql<number>`count(*)::int` }).from(classes).where(eq(classes.teacherId, teacherId))),
  ])
  return { competitions: comps, programmes: progs, classes: klasses }
}

export async function listTeachers() {
  await requireAdmin()
  const me = await currentAdminTeacherId()

  const rows = await db
    .select({
      id: teachers.id,
      name: teachers.name,
      email: teachers.email,
      isAdmin: teachers.isAdmin,
      approvedAt: teachers.approvedAt,
      hasPassword: sql<boolean>`(${teachers.passwordHash} is not null)`,
      createdAt: teachers.createdAt,
    })
    .from(teachers)
    .orderBy(teachers.id)

  return Promise.all(rows.map(async r => ({
    ...r,
    isSelf: r.id === me,
    blockers: await blockersFor(r.id),
  })))
}

export async function updateTeacher(teacherId: number, formData: FormData) {
  await requireAdmin()

  const name = ((formData.get('name') as string) ?? '').trim()
  const email = ((formData.get('email') as string) ?? '').toLowerCase().trim()
  const makeAdmin = formData.get('isAdmin') !== null
  const password = ((formData.get('password') as string) ?? '').trim()

  if (!name || !email) return { error: 'Name and email are both required.' }
  if (password && password.length < 8) return { error: 'A new password needs at least 8 characters.' }

  const [target] = await db.select().from(teachers).where(eq(teachers.id, teacherId))
  if (!target) return { error: 'That account no longer exists.' }

  const [clash] = await db
    .select({ id: teachers.id })
    .from(teachers)
    .where(and(eq(teachers.email, email), ne(teachers.id, teacherId)))
  if (clash) return { error: 'Another account already uses that email.' }

  // Removing the last admin would lock everyone out of this panel.
  if (target.isAdmin && !makeAdmin) {
    const [{ n }] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(teachers)
      .where(and(eq(teachers.isAdmin, true), ne(teachers.id, teacherId)))
    if (n === 0) return { error: 'This is the only admin. Promote someone else first.' }
  }

  await db
    .update(teachers)
    .set({
      name,
      email,
      isAdmin: makeAdmin,
      ...(password ? { passwordHash: await bcrypt.hash(password, 10) } : {}),
    })
    .where(eq(teachers.id, teacherId))

  // A changed password or revoked admin rights should not leave old sign-in
  // links usable.
  if (password || (target.isAdmin && !makeAdmin)) {
    await db.update(loginTokens).set({ usedAt: new Date() }).where(eq(loginTokens.teacherId, teacherId))
  }

  revalidatePath('/admin')
  return { success: true }
}

/**
 * Deletes a teacher account.
 *
 * Refused while they still own competitions, programmes or classes — those
 * rows require an owner, and silently reassigning them would be worse than
 * saying no. Sign-in links, co-organiser rows and redeemed invites are cleaned
 * up, since none of them carry anything worth keeping.
 */
export async function deleteTeacher(teacherId: number) {
  await requireAdmin()

  const me = await currentAdminTeacherId()
  if (me === teacherId) return { error: 'You cannot delete the account you are signed in with.' }

  const [target] = await db.select().from(teachers).where(eq(teachers.id, teacherId))
  if (!target) return { error: 'That account no longer exists.' }

  if (target.isAdmin) {
    const [{ n }] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(teachers)
      .where(and(eq(teachers.isAdmin, true), ne(teachers.id, teacherId)))
    if (n === 0) return { error: 'This is the only admin. Promote someone else first.' }
  }

  const blockers = await blockersFor(teacherId)
  const owned = [
    blockers.programmes && `${blockers.programmes} programme${blockers.programmes === 1 ? '' : 's'}`,
    blockers.competitions && `${blockers.competitions} competition${blockers.competitions === 1 ? '' : 's'}`,
    blockers.classes && `${blockers.classes} class${blockers.classes === 1 ? '' : 'es'}`,
  ].filter(Boolean)

  if (owned.length > 0) {
    return {
      error: `${target.name} still owns ${owned.join(', ')}. Reassign those first — deleting the account would leave them without an owner.`,
    }
  }

  await db.delete(loginTokens).where(eq(loginTokens.teacherId, teacherId))
  await db.delete(competitionOrganizers).where(eq(competitionOrganizers.teacherId, teacherId))
  await db.update(invites).set({ usedByTeacherId: null }).where(eq(invites.usedByTeacherId, teacherId))
  await db.delete(teachers).where(eq(teachers.id, teacherId))

  revalidatePath('/admin')
  return { success: true }
}

export async function approveTeacher(teacherId: number) {
  await requireAdmin()

  const [target] = await db.select().from(teachers).where(eq(teachers.id, teacherId))
  if (!target) return { error: 'That account no longer exists.' }
  if (target.approvedAt) return { success: true }

  await db.update(teachers).set({ approvedAt: new Date() }).where(eq(teachers.id, teacherId))
  revalidatePath('/admin')
  return { success: true }
}

/**
 * Declines a pending request and removes the account.
 *
 * The invite code stays spent: if a request is being declined because the
 * wrong person redeemed it, reviving the code would hand it back to them.
 * Generate a fresh code for the person who should have had it.
 */
export async function declineTeacher(teacherId: number) {
  await requireAdmin()

  const [target] = await db.select().from(teachers).where(eq(teachers.id, teacherId))
  if (!target) return { error: 'That account no longer exists.' }
  if (target.approvedAt) return { error: 'That account is already approved. Delete it instead.' }

  const me = await currentAdminTeacherId()
  if (me === teacherId) return { error: 'You cannot decline your own account.' }

  await db.delete(loginTokens).where(eq(loginTokens.teacherId, teacherId))
  await db.delete(competitionOrganizers).where(eq(competitionOrganizers.teacherId, teacherId))
  await db.update(invites).set({ usedByTeacherId: null }).where(eq(invites.usedByTeacherId, teacherId))
  await db.delete(teachers).where(eq(teachers.id, teacherId))

  revalidatePath('/admin')
  return { success: true }
}
