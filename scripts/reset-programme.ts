import { db } from '../src/db/index'
import { programmes, classes } from '../src/db/schema'
import { eq } from 'drizzle-orm'
import { MAX_GROUPS_PER_CLASS } from '../src/lib/allocation'

// Renames an existing programme and creates a fresh one with the same classes
// and headcounts but no launched rounds, so the seeded programme can be kept
// as a demo while the real run starts clean.
//
//   npx tsx --env-file=.env.local scripts/reset-programme.ts 1 "Demo" "Primary 6 WizBiz" [--confirm]

const SOURCE_ID = Number(process.argv[2]) || 1
const RENAME_TO = process.argv[3] ?? 'Demo'
const NEW_NAME = process.argv[4] ?? 'Primary 6 WizBiz'
const CONFIRM = process.argv.includes('--confirm')

async function main() {
  const [source] = await db.select().from(programmes).where(eq(programmes.id, SOURCE_ID))
  if (!source) throw new Error(`No programme ${SOURCE_ID}`)

  const sourceClasses = await db
    .select({ name: classes.name, headcount: classes.headcount })
    .from(classes)
    .where(eq(classes.programmeId, SOURCE_ID))
    .orderBy(classes.id)

  const [clash] = await db.select({ id: programmes.id }).from(programmes).where(eq(programmes.name, NEW_NAME))
  if (clash && clash.id !== SOURCE_ID) throw new Error(`A programme called "${NEW_NAME}" already exists.`)

  console.log(`Rename  #${SOURCE_ID} "${source.name}"  ->  "${RENAME_TO}"`)
  console.log(`         keeps its seeded round 1, round 2 and all student data\n`)
  console.log(`Create  "${NEW_NAME}"  owner: teacher #${source.ownerTeacherId}`)
  for (const c of sourceClasses) console.log(`         ${c.name.padEnd(20)} ${c.headcount} students`)
  console.log(`         no competitions, no teams, no students — round 1 not launched`)

  if (!CONFIRM) {
    console.log('\nDry run. Re-run with --confirm to apply.')
    process.exit(0)
  }

  await db.update(programmes).set({ name: RENAME_TO }).where(eq(programmes.id, SOURCE_ID))

  const [fresh] = await db
    .insert(programmes)
    .values({ ownerTeacherId: source.ownerTeacherId, name: NEW_NAME })
    .returning()

  await db.insert(classes).values(
    sourceClasses.map((c, i) => ({
      programmeId: fresh.id,
      name: c.name,
      headcount: c.headcount,
      themeOffset: i * MAX_GROUPS_PER_CLASS,
    }))
  )

  console.log(`\nDone. "${RENAME_TO}" is #${SOURCE_ID}; "${NEW_NAME}" is #${fresh.id}.`)
  console.log(`Open /teacher/programmes/${fresh.id} and use Launch round 1 when you are ready.`)
  process.exit(0)
}

main()
