import { getSession } from '@/lib/auth'
import { logout } from '@/lib/actions'
import { redirect } from 'next/navigation'

export default async function StudentDashboard() {
  const session = await getSession()
  if (!session || session.role !== 'student') redirect('/')

  return (
    <main className="min-h-screen bg-amber-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-amber-600">Student Dashboard</h1>
          <form action={logout}>
            <button className="text-sm text-gray-500 hover:underline">Logout</button>
          </form>
        </div>
        <p className="text-gray-500">Marketplace coming soon.</p>
      </div>
    </main>
  )
}
