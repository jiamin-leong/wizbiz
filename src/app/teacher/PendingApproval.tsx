import { logout } from '@/lib/actions'

export default function PendingApproval({ name, email }: { name: string; email: string }) {
  return (
    <main className="grid-bg min-h-screen flex items-center justify-center px-6 py-10">
      <div className="card rounded-2xl p-8 w-full max-w-md">
        <p className="mb-4 inline-block border border-ink bg-paper-2 px-2.5 py-1 text-[9px] tracking-[0.18em] text-ink font-pixel">
          AWAITING APPROVAL
        </p>
        <h1 className="chrome-text text-4xl mb-4" style={{ fontWeight: 700 }}>WizBiz</h1>

        <p className="text-base text-ink-soft leading-relaxed mb-4">
          Thanks, <span className="font-semibold text-ink">{name}</span> — your account is set up and
          your password is saved.
        </p>
        <div className="rounded-xl border-2 border-teal/30 bg-teal/[0.06] px-4 py-4 text-sm mb-5">
          <p className="font-semibold text-teal-dark mb-1">One step left</p>
          <p className="text-ink-soft leading-relaxed">
            An administrator needs to approve your account before you can see any classes or student
            data. You&apos;ll be able to sign in with <span className="font-semibold">{email}</span> and
            your password as soon as they do.
          </p>
        </div>
        <p className="text-xs text-gray-500 mb-5">
          Nothing to do here in the meantime — check back shortly, or ask whoever sent you the invite
          code.
        </p>

        <form action={logout}>
          <button className="text-sm text-gray-500 hover:text-orange transition">Sign out</button>
        </form>
      </div>
    </main>
  )
}
