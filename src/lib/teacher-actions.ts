'use server'

import { db } from '@/db'
import { competitions, groups, students } from '@/db/schema'
import { eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { GROUP_THEMES, THEME_NAMES } from '@/lib/themes'

const PASSWORD_WORDS = [
  'BLAZE', 'STORM', 'FROST', 'EMBER', 'SPARK', 'FLARE', 'DRIFT', 'CREST',
  'SURGE', 'NOVA', 'COMET', 'ORBIT', 'PULSE', 'PRISM', 'RIDGE', 'FORGE',
  'VALE', 'PEAK', 'TIDE', 'REEF', 'GUST', 'MIST', 'BOLT', 'FLASH',
  'IRON', 'GOLD', 'JADE', 'RUBY', 'ONYX', 'OPAL', 'FLINT', 'SLATE',
]

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5)
}

function generateGroupPassword(): string {
  const word = PASSWORD_WORDS[Math.floor(Math.random() * PASSWORD_WORDS.length)]
  const digits = String(Math.floor(Math.random() * 900) + 100)
  return `${word}-${digits}`
}

export async function createCompetition(formData: FormData) {
  const session = await getSession()
  if (!session || session.role !== 'teacher') redirect('/')

  const name = formData.get('name') as string
  const startDate = new Date(formData.get('startDate') as string)
  const endDate = new Date(formData.get('endDate') as string)
  const initialBalance = parseInt(formData.get('initialBalance') as string)
  const numGroups = parseInt(formData.get('numGroups') as string)

  const [competition] = await db
    .insert(competitions)
    .values({ teacherId: session.id, name, startDate, endDate, initialBalance, status: 'active' })
    .returning()

  for (let g = 0; g < numGroups; g++) {
    const theme = THEME_NAMES[g % THEME_NAMES.length]
    const items = shuffle(GROUP_THEMES[theme])
    const groupPassword = generateGroupPassword()
    const groupPasswordHash = await bcrypt.hash(groupPassword, 10)

    const [group] = await db
      .insert(groups)
      .values({ competitionId: competition.id, name: theme, balance: initialBalance, groupPassword, groupPasswordHash })
      .returning()

    const studentCodes = items.map(item => ({
      groupId: group.id,
      loginCode: `${theme.toUpperCase()}-${item}`,
      passwordHash: groupPasswordHash,
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
