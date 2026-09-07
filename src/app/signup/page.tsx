import SignupForm from './SignupForm'
import Link from 'next/link'

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>
}) {
  const { code } = await searchParams

  return (
    <main className="grid-bg min-h-screen flex items-center justify-center px-6 py-10">
      <div className="card rounded-2xl p-8 w-full max-w-sm">
        <p className="mb-4 inline-block border border-ink bg-paper-2 px-2.5 py-1 text-[9px] tracking-[0.18em] text-ink font-pixel">
          TEACHER SIGN-UP
        </p>
        <h1 className="chrome-text text-4xl mb-2" style={{ fontWeight: 700 }}>WizBiz</h1>
        <p className="text-sm text-ink-soft mb-6 leading-relaxed">
          Enter the invite code you were given to set up your teacher account.
        </p>
        <SignupForm initialCode={code ?? ''} />
        <Link href="/login/teacher" className="block text-center text-sm text-gray-400 mt-5 hover:underline">
          Already have an account? Sign in
        </Link>
      </div>
    </main>
  )
}
