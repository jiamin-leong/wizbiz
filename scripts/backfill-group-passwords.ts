import { config } from 'dotenv'
import { db } from '../src/db/index'
import { groups } from '../src/db/schema'
import bcrypt from 'bcryptjs'

config({ path: '.env.local' })

const PASSWORD_WORDS = [
  'BLAZE', 'STORM', 'FROST', 'EMBER', 'SPARK', 'FLARE', 'DRIFT', 'CREST',
  'SURGE', 'NOVA', 'COMET', 'ORBIT', 'PULSE', 'PRISM', 'RIDGE', 'FORGE',
]

function generateGroupPassword(): string {
  const word = PASSWORD_WORDS[Math.floor(Math.random() * PASSWORD_WORDS.length)]
  const digits = String(Math.floor(Math.random() * 900) + 100)
  return `${word}-${digits}`
}

async function main() {
  const allGroups = await db.select().from(groups)
  for (const g of allGroups) {
    const groupPassword = generateGroupPassword()
    const groupPasswordHash = await bcrypt.hash(groupPassword, 10)
    await db.update(groups).set({ groupPassword, groupPasswordHash }).where(require('drizzle-orm').eq(groups.id, g.id))
    console.log(`Group ${g.id} (${g.name}): ${groupPassword}`)
  }
  process.exit(0)
}

main()
