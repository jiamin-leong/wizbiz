import { db } from '@/db'
import { competitions } from '@/db/schema'
import { desc } from 'drizzle-orm'
import Link from 'next/link'
import StudentLoginForm from './StudentLoginForm'

// Competition list must be fresh — new competitions should appear immediately.
export const dynamic = 'force-dynamic'

export default async function StudentLoginPage() {
  const comps = await db
    .select({ id: competitions.id, name: competitions.name })
    .from(competitions)
    .orderBy(desc(competitions.createdAt))

  return (
    <main className="grid-bg min-h-screen flex items-center justify-center px-6">
      <div className="card rounded-2xl p-8 w-full max-w-sm">
        <p className="mb-4 inline-block border border-ink bg-paper-2 px-2.5 py-1 text-[9px] tracking-[0.18em] text-ink font-pixel">
          PLAYER LOGIN
        </p>
        <h1 className="chrome-text text-4xl mb-6" style={{ fontWeight: 700 }}>WizBiz</h1>
        <StudentLoginForm competitions={comps} />
        <Link href="/" className="block text-center text-sm text-gray-400 mt-5 hover:underline">
          Back
        </Link>
      </div>
    </main>
  )
}
