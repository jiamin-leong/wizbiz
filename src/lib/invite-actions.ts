'use server'

import { db } from '@/db'
import { invites, teachers, classes } from '@/db/schema'
import { eq, desc, isNull, and } from 'drizzle-orm'
import { randomInt } from 'crypto'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import bcrypt from 'bcryptjs'
import { createSession } from '@/lib/auth'
import { requireAdmin } from '@/lib/admin-auth'

// No vowels, no 0/O/1/I: these are read aloud in briefings and typed by hand.
const ALPHABET = '23456789BCDFGHJKLMNPQRSTVWXYZ'

function generateCode(): string {
  let body = ''
  for (let i = 0; i < 5; i++) body += ALPHABET[randomInt(ALPHABET.length)]
  return `WIZ-${body}`
}

async function uniqueCode(): Promise<string> {
  for (let attempt = 0; attempt < 20; attempt++) {
    const code = generateCode()
    const [clash] = await db.select({ id: invites.id }).from(invites).where(eq(invites.code, code))
    if (!clash) return code
  }
  throw new Error('Could not generate a unique invite code.')
}

export async function createInvites(formData: FormData) {
  await requireAdmin()

  const count = Math.min(Math.max(parseInt(formData.get('count') as string) || 1, 1), 25)
  const label = ((formData.get('label') as string) ?? '').trim()

  const rows = []
  for (let i = 0; i < count; i++) {
    rows.push({ code: await uniqueCode(), label })
  }
  await db.insert(invites).values(rows)

  revalidatePath('/admin')
  return { created: rows.map(r => r.code) }
}

export async function revokeInvite(inviteId: number) {
  await requireAdmin()
  await db.delete(invites).where(and(eq(invites.id, inviteId), isNull(invites.usedAt)))
  revalidatePath('/admin')
}

export async function listInvites() {
  await requireAdmin()
  return db
    .select({
      id: invites.id,
      code: invites.code,
      label: invites.label,
      usedAt: invites.usedAt,
      teacherName: teachers.name,
      teacherEmail: teachers.email,
    })
    .from(invites)
    .leftJoin(teachers, eq(teachers.id, invites.usedByTeacherId))
    .orderBy(desc(invites.createdAt))
}

/** Checks a code without spending it, so the sign-up form can validate as you type. */
export async function checkInvite(code: string) {
  const trimmed = code.trim().toUpperCase()
  if (!trimmed) return { valid: false as const }

  const [invite] = await db
    .select({ id: invites.id, label: invites.label, usedAt: invites.usedAt })
    .from(invites)
    .where(eq(invites.code, trimmed))

  if (!invite) return { valid: false as const, reason: 'That code was not recognised.' }
  if (invite.usedAt) return { valid: false as const, reason: 'That code has already been used.' }
  return { valid: true as const, label: invite.label }
}

/**
 * Redeems a code and creates the teacher account, pending approval.
 *
 * They choose their own password and are signed in straight away, but the
 * portal shows a waiting screen rather than any content until an admin
 * approves them — so the code gets them a seat, not the data.
 */
export async function redeemInvite(formData: FormData) {
  const code = ((formData.get('code') as string) ?? '').trim().toUpperCase()
  const name = ((formData.get('name') as string) ?? '').trim()
  const email = ((formData.get('email') as string) ?? '').toLowerCase().trim()
  const password = (formData.get('password') as string) ?? ''

  if (!code || !name || !email || !password) return { error: 'Please fill in every field.' }
  if (password.length < 8) return { error: 'Use a password of at least 8 characters.' }

  const [invite] = await db
    .select({ id: invites.id, classId: invites.classId, usedAt: invites.usedAt })
    .from(invites)
    .where(eq(invites.code, code))

  if (!invite) return { error: 'That code was not recognised.' }
  if (invite.usedAt) return { error: 'That code has already been used.' }

  const [existing] = await db.select({ id: teachers.id }).from(teachers).where(eq(teachers.email, email))
  if (existing) return { error: 'An account already exists for that email. Try signing in instead.' }

  // Claim the code first: if two people redeem the same code at once, only one
  // update matches, and the loser is told it is taken rather than getting a
  // second account.
  const claimed = await db
    .update(invites)
    .set({ usedAt: new Date() })
    .where(and(eq(invites.id, invite.id), isNull(invites.usedAt)))
    .returning({ id: invites.id })
  if (claimed.length === 0) return { error: 'That code has already been used.' }

  const passwordHash = await bcrypt.hash(password, 10)
  const [teacher] = await db
    .insert(teachers)
    // approvedAt stays null: the account exists but sees nothing yet.
    .values({ name, email, passwordHash })
    .returning({ id: teachers.id, email: teachers.email, isAdmin: teachers.isAdmin })

  await db.update(invites).set({ usedByTeacherId: teacher.id }).where(eq(invites.id, invite.id))

  // A code bound to a class also hands over that class.
  if (invite.classId) {
    await db.update(classes).set({ teacherId: teacher.id }).where(eq(classes.id, invite.classId))
  }

  await createSession({ role: 'teacher', id: teacher.id, email: teacher.email, isAdmin: teacher.isAdmin })
  redirect('/teacher')
}
