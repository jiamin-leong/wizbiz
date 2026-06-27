'use client'

import { useState } from 'react'

export default function PasswordCell({ password }: { password: string }) {
  const [revealed, setRevealed] = useState(false)

  return (
    <div className="flex items-center gap-1.5">
      <span className="font-mono text-sm bg-gray-100 text-gray-700 px-2 py-1 rounded">
        {revealed ? password : '••••••••'}
      </span>
      <button
        onClick={() => setRevealed(r => !r)}
        className="text-xs text-gray-400 hover:text-amber-500 transition"
      >
        {revealed ? 'hide' : 'show'}
      </button>
    </div>
  )
}
