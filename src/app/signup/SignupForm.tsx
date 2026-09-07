'use client'

import { useState } from 'react'
import { redeemInvite, checkInvite } from '@/lib/invite-actions'

export default function SignupForm({ initialCode }: { initialCode: string }) {
  const [code, setCode] = useState(initialCode)
  const [codeState, setCodeState] = useState<'idle' | 'ok' | 'bad'>('idle')
  const [codeNote, setCodeNote] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  // Validate on blur rather than per keystroke: a wrong code should be caught
  // before the person fills in the rest of the form, not after.
  async function validateCode() {
    const trimmed = code.trim()
    if (!trimmed) { setCodeState('idle'); setCodeNote(''); return }
    const result = await checkInvite(trimmed)
    if (result.valid) {
      setCodeState('ok')
      setCodeNote(result.label ? `Invite for ${result.label}` : 'Code accepted')
    } else {
      setCodeState('bad')
      setCodeNote(result.reason ?? 'That code was not recognised.')
    }
  }

  async function handleSubmit(formData: FormData) {
    setError('')
    setBusy(true)
    const result = await redeemInvite(formData)
    setBusy(false)
    if (result?.error) setError(result.error)
  }

  const field =
    'w-full border border-ink/20 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal'

  return (
    <form action={handleSubmit} className="flex flex-col gap-3">
      <div>
        <input
          name="code"
          value={code}
          onChange={e => { setCode(e.target.value.toUpperCase()); setCodeState('idle'); setCodeNote('') }}
          onBlur={validateCode}
          placeholder="Invite code (e.g. WIZ-4K8P2)"
          required
          autoFocus={!initialCode}
          className={`${field} font-pixel tracking-wider ${
            codeState === 'ok' ? 'border-teal ring-1 ring-teal/30'
            : codeState === 'bad' ? 'border-red-400 ring-1 ring-red-200'
            : ''
          }`}
        />
        {codeNote && (
          <p className={`text-xs mt-1 ${codeState === 'ok' ? 'text-teal-dark' : 'text-red-500'}`}>
            {codeState === 'ok' ? '✓ ' : ''}{codeNote}
          </p>
        )}
      </div>

      <input name="name" type="text" placeholder="Your name" required autoFocus={!!initialCode} className={field} />
      <input name="email" type="email" placeholder="you@school.edu" required className={field} />
      <div>
        <input name="password" type="password" placeholder="Choose a password" required minLength={8} className={field} />
        <p className="text-[11px] text-gray-400 mt-1">At least 8 characters.</p>
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <button type="submit" disabled={busy} className="btn-metal btn-orange py-2.5 text-sm disabled:opacity-50 mt-1">
        {busy ? 'Creating your account…' : 'Create my account'}
      </button>
    </form>
  )
}
