'use server'

import { db } from '@/db'
import { teachers, students, groups } from '@/db/schema'
import { eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import { createSession, deleteSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'

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
    .select({ id: students.id, groupId: students.groupId })
    .from(students)
    .where(eq(students.loginCode, loginCode.toUpperCase()))

  if (!student) return { error: 'Invalid credentials' }

  const [group] = await db
    .select({ competitionId: groups.competitionId, groupPasswordHash: groups.groupPasswordHash })
    .from(groups)
    .where(eq(groups.id, student.groupId))

  const valid = await bcrypt.compare(password, group.groupPasswordHash)
  if (!valid) return { error: 'Invalid credentials' }

  await createSession({ role: 'student', id: student.id, groupId: student.groupId, competitionId: group.competitionId })
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
