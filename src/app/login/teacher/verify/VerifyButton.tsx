'use client'

import { useState } from 'react'
import { consumeMagicLink } from '@/lib/magic-link'

export default function VerifyButton({ token }: { token: string }) {
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleClick() {
    setError('')
    setBusy(true)
    const result = await consumeMagicLink(token)
    if (result?.error) {
      setError(result.error)
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        onClick={handleClick}
        disabled={busy}
        className="btn-metal btn-orange py-2.5 text-sm disabled:opacity-50"
      >
        {busy ? 'Signing in…' : 'Sign in to WizBiz'}
      </button>
      {error && <p className="text-red-500 text-sm">{error}</p>}
    </div>
  )
}
