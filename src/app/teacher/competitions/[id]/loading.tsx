export default function Loading() {
  return (
    <main className="min-h-screen bg-amber-50 p-8">
      <div className="max-w-4xl mx-auto animate-pulse">
        <div className="h-4 bg-amber-100 rounded w-32 mb-6" />
        <div className="h-8 bg-amber-200 rounded w-64 mb-2" />
        <div className="h-4 bg-amber-100 rounded w-80 mb-8" />
        <div className="grid grid-cols-2 gap-4 mb-8">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white rounded-xl p-4 shadow-sm h-24" />
          ))}
        </div>
        <div className="h-6 bg-amber-100 rounded w-40 mb-3" />
        <div className="bg-white rounded-xl p-6 shadow-sm h-20" />
      </div>
    </main>
  )
}
