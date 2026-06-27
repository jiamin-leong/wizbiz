import { config } from 'dotenv'
import { db } from '../src/db/index'
import { groups, students } from '../src/db/schema'
import { eq } from 'drizzle-orm'

config({ path: '.env.local' })

const THEME_ITEMS: Record<string, string[]> = {
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
}
const THEMES = Object.keys(THEME_ITEMS)

async function main() {
  const allGroups = await db.select().from(groups).where(eq(groups.competitionId, 3)).orderBy(groups.id)

  for (let i = 5; i < allGroups.length; i++) {
    const g = allGroups[i]
    const theme = THEMES[i % THEMES.length]
    const items = THEME_ITEMS[theme]

    await db.update(groups).set({ name: theme }).where(eq(groups.id, g.id))

    const groupStudents = await db.select().from(students).where(eq(students.groupId, g.id)).orderBy(students.id)
    for (let j = 0; j < groupStudents.length; j++) {
      const loginCode = `${theme.toUpperCase()}-${items[j]}`
      await db.update(students).set({ loginCode }).where(eq(students.id, groupStudents[j].id))
    }
    console.log(`Updated: ${theme} → ${items.map(i => `${theme.toUpperCase()}-${i}`).join(', ')}`)
  }
  process.exit(0)
}

main()
