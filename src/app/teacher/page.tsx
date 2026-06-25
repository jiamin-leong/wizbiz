import { getSession } from '@/lib/auth'
import { logout } from '@/lib/actions'
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
    <main className="min-h-screen bg-amber-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-amber-600">Teacher Dashboard</h1>
          <form action={logout}>
            <button className="text-sm text-gray-500 hover:underline">Logout</button>
          </form>
        </div>

        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-700">Your Competitions</h2>
          <Link
            href="/teacher/competitions/new"
            className="bg-amber-500 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-amber-600 transition"
          >
            + New Competition
          </Link>
        </div>

        {myCompetitions.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center text-gray-400 shadow-sm">
            No competitions yet. Create your first one!
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
    </main>
  )
}
