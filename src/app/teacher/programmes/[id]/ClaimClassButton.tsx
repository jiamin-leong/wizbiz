'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { claimClass, releaseClass } from '@/lib/programme-actions'

export default function ClaimClassButton({
  classId,
  className,
  mine,
}: {
  classId: number
  className: string
  mine: boolean
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [confirming, setConfirming] = useState(false)

  async function claim() {
    setError('')
    setBusy(true)
    const result = await claimClass(classId)
    setBusy(false)
    if (result?.error) { setError(result.error); return }
    router.refresh()
  }

  async function release() {
    setError('')
    setBusy(true)
    const result = await releaseClass(classId)
    setBusy(false)
    setConfirming(false)
    if (result?.error) { setError(result.error); return }
    router.refresh()
  }

  if (mine) {
    return (
      <div className="flex flex-col items-end gap-1">
        {confirming ? (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-500">Give up {className}?</span>
            <button
              onClick={release}
              disabled={busy}
              className="text-xs font-semibold text-white bg-red-500 hover:bg-red-600 px-2.5 py-1 rounded-lg transition disabled:opacity-50"
            >
              {busy ? '…' : 'Release'}
            </button>
            <button onClick={() => setConfirming(false)} className="text-xs text-gray-400 hover:text-gray-600 px-1">
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirming(true)}
            className="text-xs text-gray-400 hover:text-red-500 transition"
          >
            Release
          </button>
        )}
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
    )
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={claim}
        disabled={busy}
        className="text-sm font-semibold text-orange border border-orange/40 bg-white hover:bg-orange hover:text-white px-3 py-1.5 rounded-lg transition disabled:opacity-50"
      >
        {busy ? 'Claiming…' : 'Claim this class'}
      </button>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}
