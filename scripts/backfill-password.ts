import { config } from 'dotenv'
import { db } from '../src/db/index'
import { competitions } from '../src/db/schema'
import { eq } from 'drizzle-orm'

config({ path: '.env.local' })

async function main() {
  await db.update(competitions).set({ studentPassword: 'wizbiz123' }).where(eq(competitions.id, 1))
  console.log('Backfilled password for competition 1')
  process.exit(0)
}

main()
