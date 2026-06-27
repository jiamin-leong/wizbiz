export default function Loading() {
  return (
    <main className="min-h-screen bg-amber-50 p-8">
      <div className="max-w-4xl mx-auto animate-pulse">
        <div className="h-8 bg-amber-200 rounded w-48 mb-8" />
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-xl px-6 py-4 shadow-sm h-16" />
          ))}
        </div>
      </div>
    </main>
  )
}
