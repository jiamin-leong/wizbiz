'use client'

import { useState } from 'react'

export default function PasswordReveal({ password }: { password: string }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="border border-ink/15 rounded-xl mb-4 overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex justify-between items-center px-4 py-3 bg-paper-2 hover:bg-paper-2 transition text-left"
      >
        <span className="text-sm font-medium text-orange-dark">Shared Student Password</span>
        <span className="text-orange text-sm">{open ? '▲ Hide' : '▼ Reveal'}</span>
      </button>
      {open && (
        <div className="px-4 py-3 bg-white flex items-center gap-4">
          <p className="text-2xl font-bold font-pixel text-orange-dark">{password}</p>
          <p className="text-xs text-gray-400 ml-auto text-right max-w-xs">All students use this password along with their login code.</p>
        </div>
      )}
    </div>
  )
}
