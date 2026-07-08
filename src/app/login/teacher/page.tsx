'use client'

import { teacherLogin } from '@/lib/actions'
import { useState } from 'react'
import Link from 'next/link'

export default function TeacherLoginPage() {
  const [error, setError] = useState('')

  async function handleSubmit(formData: FormData) {
    setError('')
    const result = await teacherLogin(formData)
    if (result?.error) setError(result.error)
  }

  return (
    <main className="grid-bg min-h-screen flex items-center justify-center px-6">
      <div className="card rounded-2xl p-8 w-full max-w-sm">
        <p className="mb-4 inline-block border border-ink bg-paper-2 px-2.5 py-1 text-[9px] tracking-[0.18em] text-ink font-pixel">
          TEACHER PORTAL
        </p>
        <h1 className="chrome-text text-4xl mb-6" style={{ fontWeight: 700 }}>WizBiz</h1>
        <form action={handleSubmit} className="flex flex-col gap-4">
          <input
            name="email"
            type="email"
            placeholder="Email"
            required
            className="border border-ink/20 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal"
          />
          <input
            name="password"
            type="password"
            placeholder="Password"
            required
            className="border border-ink/20 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal"
          />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button type="submit" className="btn-metal btn-orange py-2.5 text-sm">
            Log in
          </button>
        </form>
        <Link href="/" className="block text-center text-sm text-gray-400 mt-5 hover:underline">
          Back
        </Link>
      </div>
    </main>
  )
}
