import { db } from '@/db'
import { teachers } from '@/db/schema'
import { desc } from 'drizzle-orm'
import { adminLogout } from '@/lib/admin-actions'
import CreateTeacherForm from './CreateTeacherForm'

export default async function AdminPage() {
  const allTeachers = await db
    .select({ id: teachers.id, name: teachers.name, email: teachers.email, createdAt: teachers.createdAt })
    .from(teachers)
    .orderBy(desc(teachers.createdAt))

  return (
    <div className="min-h-screen bg-amber-50">
      <header className="bg-amber-500 text-white px-8 py-4 flex justify-between items-center">
        <div>
          <span className="text-xl font-extrabold">WizBiz</span>
          <span className="ml-2 text-amber-100 text-sm font-medium uppercase tracking-widest">Admin</span>
        </div>
        <form action={adminLogout}>
          <button className="text-sm bg-white text-amber-600 hover:bg-amber-50 font-semibold px-3 py-1.5 rounded-lg transition">
            Logout
          </button>
        </form>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10 flex flex-col gap-8">
        <CreateTeacherForm />

        <div>
          <h2 className="text-lg font-semibold text-gray-800 mb-3">
            Teacher Accounts
            <span className="ml-2 text-sm font-normal text-gray-400">{allTeachers.length} total</span>
          </h2>
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-amber-50 border-b border-amber-100">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Email</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Created</th>
                </tr>
              </thead>
              <tbody>
                {allTeachers.map(t => (
                  <tr key={t.id} className="border-b border-gray-50 last:border-0">
                    <td className="px-4 py-3 font-medium text-gray-700">{t.name}</td>
                    <td className="px-4 py-3 text-gray-500">{t.email}</td>
                    <td className="px-4 py-3 text-gray-400">{new Date(t.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
                {allTeachers.length === 0 && (
                  <tr><td colSpan={3} className="px-4 py-6 text-center text-gray-400">No teachers yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  )
}
