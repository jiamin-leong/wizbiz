'use server'

import { db } from '@/db'
import { teachers, loginTokens } from '@/db/schema'
import { eq, and, gt, isNull, sql } from 'drizzle-orm'
import { randomBytes, createHash } from 'crypto'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { createSession } from '@/lib/auth'
import { sendMail, emailIsConfigured } from '@/lib/email'

const TOKEN_TTL_MINUTES = 15
// Enough to stop an inbox being flooded, loose enough that a teacher who did
// not receive the first mail can simply ask again.
const MAX_LINKS_PER_HOUR = 5

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

async function baseUrl(): Promise<string> {
  const h = await headers()
  const host = h.get('host') ?? 'localhost:3000'
  const proto = host.startsWith('localhost') || host.startsWith('127.') ? 'http' : 'https'
  return `${proto}://${host}`
}

/**
 * Emails a single-use sign-in link.
 *
 * Always reports success, whether or not the address belongs to an account:
 * a different answer would turn this form into a way to discover which
 * teachers exist.
 */
export async function requestMagicLink(formData: FormData) {
  const email = ((formData.get('email') as string) ?? '').toLowerCase().trim()
  if (!email) return { error: 'Enter your email address.' }

  const sent = { sent: true as const }

  const [teacher] = await db
    .select({ id: teachers.id, name: teachers.name })
    .from(teachers)
    .where(eq(teachers.email, email))

  if (!teacher) {
    // The response is identical either way, so the form cannot be used to
    // discover who has an account. Locally that silence is just confusing, so
    // say so on the console when no mail provider is configured.
    if (!emailIsConfigured()) {
      const known = await db.select({ email: teachers.email }).from(teachers)
      console.log(
        [
          '',
          '─'.repeat(72),
          `  No teacher account for "${email}" — no link sent.`,
          `  Accounts that exist: ${known.map(k => k.email).join(', ') || '(none)'}`,
          '─'.repeat(72),
          '',
        ].join('\n')
      )
    }
    return sent
  }

  const [recent] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(loginTokens)
    .where(and(
      eq(loginTokens.teacherId, teacher.id),
      gt(loginTokens.createdAt, new Date(Date.now() - 60 * 60 * 1000)),
    ))
  if ((recent?.count ?? 0) >= MAX_LINKS_PER_HOUR) {
    if (!emailIsConfigured()) {
      console.log(`\n  Rate limit hit for ${email} (${MAX_LINKS_PER_HOUR}/hour) — no link sent.\n`)
    }
    return sent
  }

  // Any earlier unused link stops working, so only the newest email is live.
  await db
    .update(loginTokens)
    .set({ usedAt: new Date() })
    .where(and(eq(loginTokens.teacherId, teacher.id), isNull(loginTokens.usedAt)))

  const token = randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MINUTES * 60 * 1000)

  await db.insert(loginTokens).values({
    teacherId: teacher.id,
    tokenHash: hashToken(token),
    expiresAt,
  })

  const url = `${await baseUrl()}/login/teacher/verify?token=${token}`

  await sendMail({
    to: email,
    subject: 'Sign in to WizBiz',
    text: [
      `Hi ${teacher.name},`,
      '',
      'Open this link to sign in to WizBiz:',
      url,
      '',
      `The link works once and expires in ${TOKEN_TTL_MINUTES} minutes.`,
      'If you did not ask to sign in, you can ignore this email.',
    ].join('\n'),
  })

  return sent
}

/** Whether a token is still usable, without consuming it. */
export async function checkMagicLink(token: string) {
  if (!token) return { valid: false as const }

  const [row] = await db
    .select({ id: loginTokens.id, name: teachers.name, expiresAt: loginTokens.expiresAt, usedAt: loginTokens.usedAt })
    .from(loginTokens)
    .innerJoin(teachers, eq(teachers.id, loginTokens.teacherId))
    .where(eq(loginTokens.tokenHash, hashToken(token)))

  if (!row || row.usedAt || row.expiresAt < new Date()) return { valid: false as const }
  return { valid: true as const, name: row.name }
}

/**
 * Consumes the token and signs the teacher in.
 *
 * Deliberately separate from checkMagicLink: mail security scanners follow
 * links before the recipient does, and a token spent on a GET would leave the
 * teacher with a dead link. Nothing is consumed until they press the button.
 */
export async function consumeMagicLink(token: string) {
  if (!token) return { error: 'That link is not valid.' }

  const [row] = await db
    .select({
      id: loginTokens.id,
      teacherId: loginTokens.teacherId,
      email: teachers.email,
      isAdmin: teachers.isAdmin,
      expiresAt: loginTokens.expiresAt,
      usedAt: loginTokens.usedAt,
    })
    .from(loginTokens)
    .innerJoin(teachers, eq(teachers.id, loginTokens.teacherId))
    .where(eq(loginTokens.tokenHash, hashToken(token)))

  if (!row) return { error: 'That link is not valid.' }
  if (row.usedAt) return { error: 'That link has already been used. Please request a new one.' }
  if (row.expiresAt < new Date()) return { error: 'That link has expired. Please request a new one.' }

  // Mark used before creating the session, so a double submit cannot reuse it.
  const marked = await db
    .update(loginTokens)
    .set({ usedAt: new Date() })
    .where(and(eq(loginTokens.id, row.id), isNull(loginTokens.usedAt)))
    .returning({ id: loginTokens.id })
  if (marked.length === 0) return { error: 'That link has already been used. Please request a new one.' }

  await createSession({ role: 'teacher', id: row.teacherId, email: row.email, isAdmin: row.isAdmin })
  redirect('/teacher')
}
