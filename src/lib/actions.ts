'use server'

import { db } from '@/db'
import { teachers, students, groups, competitions } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import { createSession, deleteSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { competitionStatus } from '@/lib/competition'

export async function teacherLogin(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const [teacher] = await db.select().from(teachers).where(eq(teachers.email, email))
  if (!teacher) return { error: 'Invalid credentials' }

  const valid = await bcrypt.compare(password, teacher.passwordHash)
  if (!valid) return { error: 'Invalid credentials' }

  await createSession({ role: 'teacher', id: teacher.id, email: teacher.email })
  redirect('/teacher')
}

export async function studentLogin(formData: FormData) {
  const loginCode = ((formData.get('loginCode') as string) ?? '').toUpperCase().trim()
  const password = formData.get('password') as string
  const chosenCompetitionId = parseInt(formData.get('competitionId') as string)

  if (!loginCode) return { error: 'Enter your login code' }

  // Within a programme a login code is unique, so the same code and password
  // work in round 1 and round 2 without picking a competition. The selector is
  // only needed when one code genuinely matches more than one open competition
  // (a student in two unrelated competitions).
  const candidates = await db
    .select({
      id: students.id,
      groupId: students.groupId,
      competitionId: groups.competitionId,
      competitionName: competitions.name,
      startDate: competitions.startDate,
      endDate: competitions.endDate,
      groupPasswordHash: groups.groupPasswordHash,
    })
    .from(students)
    .innerJoin(groups, eq(students.groupId, groups.id))
    .innerJoin(competitions, eq(competitions.id, groups.competitionId))
    .where(
      chosenCompetitionId
        ? and(eq(students.loginCode, loginCode), eq(groups.competitionId, chosenCompetitionId))
        : eq(students.loginCode, loginCode)
    )

  if (candidates.length === 0) return { error: 'Invalid credentials' }

  const matches: typeof candidates = []
  for (const c of candidates) {
    if (await bcrypt.compare(password, c.groupPasswordHash)) matches.push(c)
  }
  if (matches.length === 0) return { error: 'Invalid credentials' }

  // A finished competition should never win over one that is still running.
  const open = matches.filter(m => competitionStatus(m.startDate, m.endDate) !== 'ended')
  const shortlist = open.length > 0 ? open : matches

  if (shortlist.length > 1) {
    return {
      error: 'You are in more than one competition — pick which one.',
      chooseFrom: shortlist.map(m => ({ id: m.competitionId, name: m.competitionName })),
    }
  }

  const student = shortlist[0]
  await createSession({
    role: 'student',
    id: student.id,
    groupId: student.groupId,
    competitionId: student.competitionId,
  })
  redirect('/student')
}

export async function logout() {
  await deleteSession()
  redirect('/')
}

export async function exitStudentPreview() {
  const cookieStore = await cookies()
  const teacherIdStr = cookieStore.get('preview_teacher_id')?.value
  cookieStore.delete('preview_teacher_id')

  if (!teacherIdStr) {
    await deleteSession()
    redirect('/')
    return
  }

  const teacherId = parseInt(teacherIdStr)
  const [teacher] = await db.select({ id: teachers.id, email: teachers.email }).from(teachers).where(eq(teachers.id, teacherId))

  if (!teacher) {
    await deleteSession()
    redirect('/')
    return
  }

  await createSession({ role: 'teacher', id: teacher.id, email: teacher.email })
  redirect('/teacher')
}
