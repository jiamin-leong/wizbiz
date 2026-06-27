import { config } from 'dotenv'
import { db } from '../src/db/index'
import { teachers } from '../src/db/schema'
import bcrypt from 'bcryptjs'

config({ path: '.env.local' })

async function main() {
  const hash = await bcrypt.hash('wizbiz123', 10)
  await db.insert(teachers).values({ email: 'teacher@wizbiz.com', passwordHash: hash, name: 'Teacher' })
  console.log('Teacher created: teacher@wizbiz.com / wizbiz123')
  process.exit(0)
}

main()
