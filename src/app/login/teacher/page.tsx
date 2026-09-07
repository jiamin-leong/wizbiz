'use client'

import { teacherLogin } from '@/lib/actions'
import { requestMagicLink } from '@/lib/magic-link'
import { useState } from 'react'
import Link from 'next/link'

export default function TeacherLoginPage() {
  // One obvious path: type your email, get a link. The password still works,
  // but it is tucked away as a fallback rather than offered as an equal
  // choice — a first-time teacher should not have to pick a method.
  const [usePassword, setUsePassword] = useState(false)
  const [error, setError] = useState('')
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function handlePassword(formData: FormData) {
    setError('')
    setBusy(true)
    const result = await teacherLogin(formData)
    setBusy(false)
    if (result?.error) setError(result.error)
  }

  async function handleLink(formData: FormData) {
    setError('')
    setBusy(true)
    const email = ((formData.get('email') as string) ?? '').trim()
    const result = await requestMagicLink(formData)
    setBusy(false)
    if ('error' in result) { setError(result.error); return }
    setSentTo(email)
  }

  const field =
    'border border-ink/20 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal'

  return (
    <main className="grid-bg min-h-screen flex items-center justify-center px-6">
      <div className="card rounded-2xl p-8 w-full max-w-sm">
        <p className="mb-4 inline-block border border-ink bg-paper-2 px-2.5 py-1 text-[9px] tracking-[0.18em] text-ink font-pixel">
          TEACHER PORTAL
        </p>
        <h1 className="chrome-text text-4xl mb-6" style={{ fontWeight: 700 }}>WizBiz</h1>

        {sentTo ? (
          <div className="flex flex-col gap-4">
            <div className="rounded-xl border-2 border-teal/30 bg-teal/[0.06] px-4 py-4 text-sm">
              <p className="font-semibold text-teal-dark mb-1">Check your email</p>
              <p className="text-ink-soft leading-relaxed">
                If <span className="font-semibold">{sentTo}</span> has a WizBiz account, a sign-in
                link is on its way. Open it and you&apos;re in.
              </p>
              <p className="text-xs text-gray-500 mt-2">
                It expires in 15 minutes. Nothing after a minute or two? Check your spam folder.
              </p>
            </div>
            <button
              onClick={() => { setSentTo(null); setError('') }}
              className="text-sm text-gray-500 hover:text-orange transition"
            >
              ← Use a different email
            </button>
          </div>
        ) : usePassword ? (
          <form action={handlePassword} className="flex flex-col gap-3">
            <p className="text-sm text-ink-soft leading-relaxed mb-1">Sign in with your password.</p>
            <input name="email" type="email" placeholder="Email" required autoFocus className={field} />
            <input name="password" type="password" placeholder="Password" required className={field} />
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button type="submit" disabled={busy} className="btn-metal btn-orange py-2.5 text-sm disabled:opacity-50 mt-1">
              {busy ? 'Logging in…' : 'Log in'}
            </button>
            <button
              type="button"
              onClick={() => { setUsePassword(false); setError('') }}
              className="text-sm text-gray-500 hover:text-orange transition mt-1"
            >
              ← Email me a link instead
            </button>
          </form>
        ) : (
          <form action={handleLink} className="flex flex-col gap-3">
            <p className="text-sm text-ink-soft leading-relaxed mb-1">
              Enter your email and we&apos;ll send you a link that signs you in. No password needed.
            </p>
            <input name="email" type="email" placeholder="you@school.edu" required autoFocus className={field} />
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button type="submit" disabled={busy} className="btn-metal btn-orange py-2.5 text-sm disabled:opacity-50 mt-1">
              {busy ? 'Sending…' : 'Email me a sign-in link'}
            </button>
            <button
              type="button"
              onClick={() => { setUsePassword(true); setError('') }}
              className="text-xs text-gray-400 hover:text-orange transition mt-2"
            >
              Prefer a password? Sign in with one
            </button>
          </form>
        )}

        <Link href="/" className="block text-center text-sm text-gray-400 mt-5 hover:underline">
          Back
        </Link>
      </div>
    </main>
  )
}
