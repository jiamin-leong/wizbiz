'use server'

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

