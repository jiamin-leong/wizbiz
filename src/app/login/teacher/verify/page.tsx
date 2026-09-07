import Link from 'next/link'
import { checkMagicLink } from '@/lib/magic-link'
import VerifyButton from './VerifyButton'

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const { token } = await searchParams
  const result = await checkMagicLink(token ?? '')

  return (
    <main className="grid-bg min-h-screen flex items-center justify-center px-6">
      <div className="card rounded-2xl p-8 w-full max-w-sm">
        <p className="mb-4 inline-block border border-ink bg-paper-2 px-2.5 py-1 text-[9px] tracking-[0.18em] text-ink font-pixel">
          TEACHER PORTAL
        </p>
        <h1 className="chrome-text text-4xl mb-6" style={{ fontWeight: 700 }}>WizBiz</h1>

        {result.valid ? (
          <>
            <p className="text-sm text-ink-soft leading-relaxed mb-5">
              Welcome back, <span className="font-semibold text-ink">{result.name}</span>. Press the
              button to finish signing in.
            </p>
            <VerifyButton token={token ?? ''} />
          </>
        ) : (
          <>
            <div className="rounded-xl border-2 border-orange/30 bg-orange/[0.06] px-4 py-4 text-sm mb-5">
              <p className="font-semibold text-orange-dark mb-1">This link no longer works</p>
              <p className="text-ink-soft leading-relaxed">
                Sign-in links can only be used once, and expire after 15 minutes. Request a fresh one
                and it will work.
              </p>
            </div>
            <Link href="/login/teacher" className="btn-metal btn-orange py-2.5 text-sm block text-center">
              Get a new link
            </Link>
          </>
        )}

        <Link href="/" className="block text-center text-sm text-gray-400 mt-5 hover:underline">
          Back
        </Link>
      </div>
    </main>
  )
}
