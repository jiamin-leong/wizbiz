'use client'

import { useState, useTransition } from 'react'

/**
 * Deleting is permanent, so the button only opens a panel; the delete itself
 * needs the item's name typed back.
 */
export default function ConfirmDelete({
  name,
  what,
  onDelete,
}: {
  name: string
  what: string
  onDelete: () => Promise<{ error?: string; success?: boolean }>
}) {
  const [open, setOpen] = useState(false)
  const [typed, setTyped] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function confirm() {
    startTransition(async () => {
      const res = await onDelete()
      if (res.error) setError(res.error)
    })
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="text-sm text-gray-500 hover:text-red-600 border border-gray-200 hover:border-red-300 px-3 py-1.5 rounded-lg transition"
      >
        🗑 Delete
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 z-20 w-[min(26rem,85vw)] border border-red-200 bg-red-50 rounded-xl p-4 text-left shadow-lg">
          <p className="text-sm text-red-700 font-semibold">Delete &ldquo;{name.trim()}&rdquo; permanently?</p>
          <p className="text-xs text-red-600 mt-1">{what} This cannot be undone.</p>
          <input
            value={typed}
            onChange={e => setTyped(e.target.value)}
            placeholder={`Type "${name.trim()}" to confirm`}
            className="w-full mt-3 border border-red-200 rounded-lg px-3 py-1.5 text-sm bg-white"
          />
          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={confirm}
              disabled={typed.trim() !== name.trim() || pending}
              className="text-sm font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-40 px-3 py-1.5 rounded-lg transition"
            >
              {pending ? 'Deleting…' : 'Delete forever'}
            </button>
            <button
              onClick={() => { setOpen(false); setTyped(''); setError(null) }}
              className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg border border-gray-200 bg-white transition"
            >
              Cancel
            </button>
          </div>
          {error && <p className="text-xs text-red-700 mt-2">{error}</p>}
        </div>
      )}
    </div>
  )
}
