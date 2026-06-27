import { config } from 'dotenv'
import { db } from '../src/db/index'
import { competitions, groups, students } from '../src/db/schema'

config({ path: '.env.local' })

async function main() {
  const allGroups = await db.select().from(groups)
  console.log('Groups:', JSON.stringify(allGroups, null, 2))
  const allStudents = await db.select({ id: students.id, loginCode: students.loginCode, groupId: students.groupId }).from(students)
  console.log('Students:', JSON.stringify(allStudents, null, 2))
  process.exit(0)
}

main()
