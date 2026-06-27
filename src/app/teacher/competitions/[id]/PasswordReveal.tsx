'use client'

import { useState } from 'react'

export default function PasswordReveal({ password }: { password: string }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="border border-amber-200 rounded-xl mb-4 overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex justify-between items-center px-4 py-3 bg-amber-50 hover:bg-amber-100 transition text-left"
      >
        <span className="text-sm font-medium text-amber-700">Shared Student Password</span>
        <span className="text-amber-500 text-sm">{open ? '▲ Hide' : '▼ Reveal'}</span>
      </button>
      {open && (
        <div className="px-4 py-3 bg-white flex items-center gap-4">
          <p className="text-2xl font-bold font-mono text-amber-800">{password}</p>
          <p className="text-xs text-gray-400 ml-auto text-right max-w-xs">All students use this password along with their login code.</p>
        </div>
      )}
    </div>
  )
}
