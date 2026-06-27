import { getSession } from '@/lib/auth'
import { logout, exitStudentPreview } from '@/lib/actions'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'

export default async function StudentDashboard() {
  const session = await getSession()
  if (!session || session.role !== 'student') redirect('/')

  const cookieStore = await cookies()
  const isPreview = !!cookieStore.get('preview_teacher_id')

  return (
    <>
      {isPreview && (
        <div className="fixed top-0 inset-x-0 z-50 bg-amber-500 text-white flex items-center justify-between px-6 py-2.5 shadow-md">
          <div className="flex items-center gap-2 text-sm font-medium">
            <span>👁</span>
            <span>You are previewing the student view</span>
          </div>
          <form action={exitStudentPreview}>
            <button className="text-sm font-semibold bg-white text-amber-600 hover:bg-amber-50 px-3 py-1 rounded-lg transition">
              ← Exit Preview
            </button>
          </form>
        </div>
      )}
      <main className={`min-h-screen bg-amber-50 p-8 ${isPreview ? 'pt-20' : ''}`}>
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-amber-600">Student Dashboard</h1>
            {!isPreview && (
              <form action={logout}>
                <button className="text-sm text-gray-500 hover:underline">Logout</button>
              </form>
            )}
          </div>
          <p className="text-gray-500">Marketplace coming soon.</p>
        </div>
      </main>
    </>
  )
}
