import { getSession } from '@/lib/auth'
import { db } from '@/db'
import { competitions } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function TeacherDashboard() {
  const session = await getSession()
  if (!session || session.role !== 'teacher') redirect('/')

  const myCompetitions = await db
    .select()
    .from(competitions)
    .where(eq(competitions.teacherId, session.id))
    .orderBy(competitions.createdAt)

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Your Competitions</h1>

      {myCompetitions.length === 0 ? (
        <div className="bg-white rounded-xl p-8 text-center text-gray-400 shadow-sm">
          No competitions yet.{' '}
          <Link href="/teacher/competitions/new" className="text-amber-500 hover:underline font-medium">
            Create your first one
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {myCompetitions.map(c => (
            <Link
              key={c.id}
              href={`/teacher/competitions/${c.id}`}
              className="bg-white rounded-xl px-6 py-4 shadow-sm flex justify-between items-center hover:shadow-md transition"
            >
              <div>
                <p className="font-semibold text-gray-800">{c.name}</p>
                <p className="text-sm text-gray-400">
                  {new Date(c.startDate).toLocaleDateString()} → {new Date(c.endDate).toLocaleDateString()}
                </p>
              </div>
              <span className={`text-xs font-medium px-3 py-1 rounded-full ${
                c.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
              }`}>
                {c.status}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
