import { config } from 'dotenv'
import { db } from '../src/db/index'
import { competitions, groups, students } from '../src/db/schema'

config({ path: '.env.local' })

async function main() {
  const rows = await db.select().from(competitions)
  console.log('Competitions:', JSON.stringify(rows, null, 2))
  process.exit(0)
}

main()
