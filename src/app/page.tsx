import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-amber-50">
      <div className="text-center mb-10">
        <h1 className="text-5xl font-bold text-amber-600 mb-2">WizBiz</h1>
        <p className="text-gray-600 text-lg">Learn to earn. Build to win.</p>
      </div>
      <div className="flex gap-4">
        <Link
          href="/login/teacher"
          className="px-8 py-4 bg-amber-500 text-white rounded-xl font-semibold text-lg hover:bg-amber-600 transition"
        >
          Teacher Login
        </Link>
        <Link
          href="/login/student"
          className="px-8 py-4 bg-white border-2 border-amber-500 text-amber-600 rounded-xl font-semibold text-lg hover:bg-amber-50 transition"
        >
          Student Login
        </Link>
      </div>
    </main>
  )
}
