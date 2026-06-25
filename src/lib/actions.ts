'use server'

import { db } from '@/db'
import { teachers, students } from '@/db/schema'
import { eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import { createSession, deleteSession } from '@/lib/auth'
import { redirect } from 'next/navigation'

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
  const loginCode = formData.get('loginCode') as string
  const password = formData.get('password') as string

  const [student] = await db
    .select({ id: students.id, passwordHash: students.passwordHash, groupId: students.groupId })
    .from(students)
    .where(eq(students.loginCode, loginCode.toUpperCase()))

  if (!student) return { error: 'Invalid credentials' }

  const valid = await bcrypt.compare(password, student.passwordHash)
  if (!valid) return { error: 'Invalid credentials' }

  // Get competition id via group
  const { groups } = await import('@/db/schema')
  const [group] = await db.select({ competitionId: groups.competitionId }).from(groups).where(eq(groups.id, student.groupId))

  await createSession({ role: 'student', id: student.id, groupId: student.groupId, competitionId: group.competitionId })
  redirect('/student')
}

export async function logout() {
  await deleteSession()
  redirect('/')
}
