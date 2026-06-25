'use server'

import { db } from '@/db'
import { competitions, groups, students } from '@/db/schema'
import { eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'

export async function createCompetition(formData: FormData) {
  const session = await getSession()
  if (!session || session.role !== 'teacher') redirect('/')

  const name = formData.get('name') as string
  const startDate = new Date(formData.get('startDate') as string)
  const endDate = new Date(formData.get('endDate') as string)
  const initialBalance = parseInt(formData.get('initialBalance') as string)
  const numGroups = parseInt(formData.get('numGroups') as string)
  const studentPassword = formData.get('studentPassword') as string

  const [competition] = await db
    .insert(competitions)
    .values({ teacherId: session.id, name, startDate, endDate, initialBalance, status: 'active' })
    .returning()

  const passwordHash = await bcrypt.hash(studentPassword, 10)

  for (let g = 1; g <= numGroups; g++) {
    const [group] = await db
      .insert(groups)
      .values({ competitionId: competition.id, name: `Group ${g}`, balance: initialBalance })
      .returning()

    const studentCodes = ['A', 'B', 'C', 'D', 'E'].map(letter => ({
      groupId: group.id,
      loginCode: `GRP${g}-${letter}`,
      passwordHash,
    }))

    await db.insert(students).values(studentCodes)
  }

  redirect(`/teacher/competitions/${competition.id}`)
}

export async function updateListingStatus(
  listingId: number,
  status: 'approved' | 'rejected',
  editedName?: string,
  editedDescription?: string,
  editedPrice?: number
) {
  const session = await getSession()
  if (!session || session.role !== 'teacher') redirect('/')

  const { listings } = await import('@/db/schema')
  await db
    .update(listings)
    .set({
      status,
      ...(editedName && { name: editedName }),
      ...(editedDescription !== undefined && { description: editedDescription }),
      ...(editedPrice && { price: editedPrice }),
    })
    .where(eq(listings.id, listingId))
}
