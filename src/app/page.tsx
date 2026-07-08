import Link from 'next/link'

export default function Home() {
  return (
    <main className="grid-bg relative min-h-screen overflow-hidden flex items-center">
      {/* Mid-century geometric shapes */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full"
        style={{ background: 'radial-gradient(circle at 35% 30%, #f28a44, #c85d1c)' }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute right-40 top-52 h-24 w-48 rounded-full border-2 border-teal"
        style={{ background: 'linear-gradient(180deg, #2aa69a, #166b63)' }}
      />

      <div className="relative z-10 mx-auto w-full max-w-5xl px-6 py-16">
        <div className="grid items-center gap-12 md:grid-cols-[1.4fr_1fr]">
          {/* Left: wordmark + actions */}
          <div>
            <p
              className="mb-6 inline-block border border-ink bg-paper-2 px-3 py-1 text-[10px] tracking-[0.18em] text-ink"
              style={{ fontFamily: 'var(--font-pixel)' }}
            >
              EST. 2026 · CLASSROOM ECONOMY
            </p>

            <h1
              className="chrome-text select-none text-7xl leading-[0.9] sm:text-8xl"
              style={{ fontFamily: 'var(--font-display)', fontWeight: 700, letterSpacing: '-0.02em' }}
            >
              WizBiz
            </h1>

            <div className="mt-3 mb-8 flex items-center gap-3">
              <span className="iridescent inline-block h-2 w-24 rounded-full" aria-hidden />
              <p className="text-lg text-ink-soft">Learn to earn. Build to win.</p>
            </div>

            <div className="flex flex-wrap gap-4">
              <Link href="/login/teacher" className="btn-metal btn-orange px-8 py-3.5 text-base">
                Teacher Login
              </Link>
              <Link href="/login/student" className="btn-metal btn-chrome px-8 py-3.5 text-base">
                Student Login
              </Link>
            </div>
          </div>

          {/* Right: the signature WizCoin */}
          <div className="flex justify-center md:justify-end">
            <div className="coin h-52 w-52">
              <div className="text-center">
                <div
                  className="text-4xl text-ink"
                  style={{ fontFamily: 'var(--font-pixel)' }}
                >
                  1000
                </div>
                <div
                  className="mt-1 text-[10px] tracking-[0.2em] text-ink-soft"
                  style={{ fontFamily: 'var(--font-pixel)' }}
                >
                  WIZCOINS
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
