'use server'

import { db } from '@/db'
import { teachers } from '@/db/schema'
import { eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import { createAdminSession, deleteAdminSession } from '@/lib/auth'
import { redirect } from 'next/navigation'

export async function adminLogin(formData: FormData) {
  const password = formData.get('password') as string
  if (!process.env.ADMIN_PASSWORD || password !== process.env.ADMIN_PASSWORD) {
    return { error: 'Invalid password' }
  }
  await createAdminSession()
  redirect('/admin')
}

export async function adminLogout() {
  await deleteAdminSession()
  redirect('/admin/login')
}

export async function createTeacher(formData: FormData) {
  const name = (formData.get('name') as string).trim()
  const email = (formData.get('email') as string).toLowerCase().trim()
  const password = formData.get('password') as string

  if (!name || !email || !password) return { error: 'All fields are required' }

  const [existing] = await db.select({ id: teachers.id }).from(teachers).where(eq(teachers.email, email))
  if (existing) return { error: 'An account with that email already exists' }

  const passwordHash = await bcrypt.hash(password, 10)
  await db.insert(teachers).values({ name, email, passwordHash })
  return { success: true }
}
