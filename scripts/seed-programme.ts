import { db } from '../src/db/index'
import { programmes, classes } from '../src/db/schema'
import { eq, and } from 'drizzle-orm'
import { allocateGroups, allocationError, MAX_GROUPS_PER_CLASS } from '../src/lib/allocation'

const OWNER_TEACHER_ID = 1
const PROGRAMME_NAME = 'Primary 6 WizBiz'

const CLASSES: [string, number][] = [
  ['6 CARE', 41],
  ['6 EMPATHY', 40],
  ['6 INTEGRITY', 40],
  ['6 RESILIENCE', 40],
  ['6 RESPECT', 39],
  ['6 RESPONSIBILITY', 35],
  ['6 SELF-DISCIPLINE', 37],
]

async function main() {
  for (const [name, headcount] of CLASSES) {
    const err = allocationError(headcount)
    if (err) throw new Error(`${name}: ${err}`)
  }

  const [existing] = await db
    .select({ id: programmes.id })
    .from(programmes)
    .where(and(eq(programmes.ownerTeacherId, OWNER_TEACHER_ID), eq(programmes.name, PROGRAMME_NAME)))
  if (existing) {
    console.log(`Programme "${PROGRAMME_NAME}" already exists (id ${existing.id}). Nothing to do.`)
    process.exit(0)
  }

  const [programme] = await db
    .insert(programmes)
    .values({ ownerTeacherId: OWNER_TEACHER_ID, name: PROGRAMME_NAME })
    .returning()

  // themeOffset reserves a block of themes per class so no two classes can mint
  // the same team name — which is what keeps login codes unique in the final.
  await db.insert(classes).values(
    CLASSES.map(([name, headcount], i) => ({
      programmeId: programme.id,
      name,
      headcount,
      themeOffset: i * MAX_GROUPS_PER_CLASS,
    }))
  )

  let teams = 0
  console.log(`Created "${programme.name}" (id ${programme.id})\n`)
  for (const [name, headcount] of CLASSES) {
    const sizes = allocateGroups(headcount)
    teams += sizes.length
    console.log(`  ${name.padEnd(20)} ${String(headcount).padStart(3)} students → ${sizes.length} teams · ${sizes.join(',')}`)
  }
  const students = CLASSES.reduce((s, [, h]) => s + h, 0)
  console.log(`\n  ${CLASSES.length} classes · ${students} students · ${teams} teams · ${CLASSES.length * 3} finalists`)
  console.log(`\nOpen /teacher/programmes/${programme.id} and use Launch round 1 to set dates and capital.`)
  process.exit(0)
}

main()
