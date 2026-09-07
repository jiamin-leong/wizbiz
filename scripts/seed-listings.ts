import { config } from 'dotenv'
config({ path: '.env.local' })

import { db } from '../src/db/index'
import { groups, students, listings, competitions } from '../src/db/schema'
import { eq } from 'drizzle-orm'

const APPROVED_LISTINGS = [
  { name: 'Handmade Bookmark', description: 'Decorated with stickers and drawings', price: 200, quantity: 5 },
  { name: 'Friendship Bracelet', description: 'Woven by hand, pick your colour', price: 350, quantity: 4 },
  { name: 'Origami Set', description: '5 origami animals packed in a bag', price: 500, quantity: 3 },
  { name: 'Pencil Case Decor', description: 'We decorate your pencil case for you!', price: 800, quantity: 2 },
  { name: 'Cookie (1 pc)', description: 'Home-baked chocolate chip cookie', price: 150, quantity: 10 },
  { name: 'Math Tutoring (15 min)', description: 'One-on-one help with your homework', price: 1000, quantity: 3 },
  { name: 'Custom Doodle', description: 'We draw anything you want on paper', price: 400, quantity: 6 },
  { name: 'Sticker Pack', description: '10 assorted stickers', price: 250, quantity: 8 },
  { name: 'Eraser Set', description: '3 novelty erasers in fun shapes', price: 300, quantity: 5 },
  { name: 'Study Notes', description: 'Neat handwritten notes for one topic', price: 600, quantity: 4 },
]

const PENDING_LISTINGS = [
  { name: 'Secret Snack Box', description: 'Mystery snack — surprise inside!', price: 700, quantity: 3 },
  { name: 'Personalised Card', description: 'Written just for you or a friend', price: 450, quantity: 5 },
  { name: 'Mini Plant Pot', description: 'Tiny succulent in a decorated pot', price: 1200, quantity: 2 },
]

async function main() {
  // Find the most recent active competition
  const [competition] = await db.select().from(competitions).where(eq(competitions.status, 'active'))
  if (!competition) { console.log('No active competition found'); process.exit(1) }
  console.log(`Seeding listings for: ${competition.name}`)

  const allGroups = await db.select().from(groups).where(eq(groups.competitionId, competition.id))

  for (const group of allGroups) {
    const [firstStudent] = await db.select({ id: students.id }).from(students).where(eq(students.groupId, group.id))
    if (!firstStudent) { console.log(`Skipping ${group.name} — no students`); continue }

    // Pick 3-4 random approved listings for this group
    const shuffled = [...APPROVED_LISTINGS].sort(() => Math.random() - 0.5).slice(0, 4)
    for (const l of shuffled) {
      await db.insert(listings).values({ groupId: group.id, createdBy: firstStudent.id, status: 'approved', ...l })
    }

    // 1-2 pending
    const pendingCount = Math.random() > 0.4 ? 2 : 1
    const pendingPick = [...PENDING_LISTINGS].sort(() => Math.random() - 0.5).slice(0, pendingCount)
    for (const l of pendingPick) {
      await db.insert(listings).values({ groupId: group.id, createdBy: firstStudent.id, status: 'pending', ...l })
    }

    console.log(`${group.name}: ${shuffled.length} approved, ${pendingPick.length} pending`)
  }

  process.exit(0)
}

main()
