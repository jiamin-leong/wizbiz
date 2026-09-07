// Dev helper: prints a working sign-in link without needing a mail provider.
//   npx tsx --env-file=.env.local scripts/dev-signin-link.ts [email] [port]
import { db } from '../src/db/index'
import { teachers, loginTokens } from '../src/db/schema'
import { eq, and, isNull } from 'drizzle-orm'
import { randomBytes, createHash } from 'crypto'

// Issues a real sign-in link for local testing, exactly as the app would.
const EMAIL = process.argv[2] ?? 'teacher@wizbiz.com'
const PORT = process.argv[3] ?? '3001'

async function main() {
  const [t] = await db.select().from(teachers).where(eq(teachers.email, EMAIL.toLowerCase()))
  if (!t) {
    const all = await db.select({ email: teachers.email }).from(teachers)
    console.log(`No account for ${EMAIL}. Accounts: ${all.map(a => a.email).join(', ')}`)
    process.exit(1)
  }
  await db.update(loginTokens).set({ usedAt: new Date() })
    .where(and(eq(loginTokens.teacherId, t.id), isNull(loginTokens.usedAt)))
  const token = randomBytes(32).toString('hex')
  await db.insert(loginTokens).values({
    teacherId: t.id,
    tokenHash: createHash('sha256').update(token).digest('hex'),
    expiresAt: new Date(Date.now() + 15 * 60 * 1000),
  })
  console.log(`\nSign-in link for ${t.name} <${t.email}> — valid 15 minutes, one use:\n`)
  console.log(`  http://localhost:${PORT}/login/teacher/verify?token=${token}\n`)
  process.exit(0)
}
main()
