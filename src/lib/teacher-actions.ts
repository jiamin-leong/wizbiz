'use server'

import { db } from '@/db'
import { competitions, groups, students } from '@/db/schema'
import { eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'

const GROUP_THEMES: Record<string, string[]> = {
  Fruits:    ['APPLE', 'MANGO', 'BERRY', 'GRAPE', 'LEMON'],
  Animals:   ['TIGER', 'PANDA', 'EAGLE', 'SHARK', 'WOLF'],
  People:    ['CHIEF', 'SCOUT', 'SAGE', 'HERO', 'ACE'],
  Colors:    ['AMBER', 'CORAL', 'JADE', 'RUBY', 'ONYX'],
  Sports:    ['SPRINT', 'VAULT', 'LUNGE', 'PIVOT', 'SURGE'],
  Space:     ['COMET', 'NOVA', 'ORBIT', 'PULSAR', 'NEBULA'],
  Ocean:     ['KELP', 'TIDE', 'DRIFT', 'WAVE', 'REEF'],
  Weather:   ['STORM', 'FROST', 'BLAZE', 'GUST', 'MIST'],
  Music:     ['CHORD', 'TEMPO', 'PITCH', 'RIFF', 'BEAT'],
  Mountains: ['PEAK', 'RIDGE', 'CLIFF', 'VALE', 'CREST'],
  Rivers:    ['BROOK', 'CREEK', 'DELTA', 'RAPID', 'FORD'],
  Birds:     ['SWIFT', 'CRANE', 'FINCH', 'ROBIN', 'WREN'],
  Planets:   ['MARS', 'VENUS', 'SATURN', 'PLUTO', 'LUNA'],
  Flowers:   ['ROSE', 'LILY', 'IRIS', 'POPPY', 'DAISY'],
  Food:      ['PASTA', 'CURRY', 'SUSHI', 'TACO', 'WAFFLE'],
  Insects:   ['MOTH', 'WASP', 'BEETLE', 'CRICKET', 'ANT'],
  Minerals:  ['QUARTZ', 'TOPAZ', 'GARNET', 'FLINT', 'OPAL'],
  Vehicles:  ['ROCKET', 'KAYAK', 'GLIDER', 'BLIMP', 'TRAM'],
  Countries: ['ATLAS', 'HAVEN', 'MESA', 'VALE', 'FORGE'],
  Plants:    ['FERN', 'CACTUS', 'BONSAI', 'MOSS', 'VINE'],
}

const THEME_NAMES = Object.keys(GROUP_THEMES)

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5)
}

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
    .values({ teacherId: session.id, name, startDate, endDate, initialBalance, studentPassword, status: 'active' })
    .returning()

  const passwordHash = await bcrypt.hash(studentPassword, 10)

  for (let g = 0; g < numGroups; g++) {
    const theme = THEME_NAMES[g % THEME_NAMES.length]
    const items = shuffle(GROUP_THEMES[theme])

    const [group] = await db
      .insert(groups)
      .values({ competitionId: competition.id, name: theme, balance: initialBalance })
      .returning()

    const studentCodes = items.map(item => ({
      groupId: group.id,
      loginCode: `${theme.toUpperCase()}-${item}`,
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
