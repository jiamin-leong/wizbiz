'use client'

import { studentLogin } from '@/lib/actions'
import { useState } from 'react'
import Link from 'next/link'

export default function StudentLoginPage() {
  const [error, setError] = useState('')

  async function handleSubmit(formData: FormData) {
    setError('')
    const result = await studentLogin(formData)
    if (result?.error) setError(result.error)
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-amber-50">
      <div className="bg-white p-8 rounded-2xl shadow-md w-full max-w-sm">
        <h1 className="text-2xl font-bold text-amber-600 mb-6">Student Login</h1>
        <form action={handleSubmit} className="flex flex-col gap-4">
          <input
            name="loginCode"
            type="text"
            placeholder="Login Code (e.g. GRP1-A)"
            required
            className="border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 uppercase"
          />
          <input
            name="password"
            type="password"
            placeholder="Password"
            required
            className="border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="submit"
            className="bg-amber-500 text-white rounded-lg py-2 font-semibold hover:bg-amber-600 transition"
          >
            Login
          </button>
        </form>
        <Link href="/" className="block text-center text-sm text-gray-400 mt-4 hover:underline">
          Back
        </Link>
      </div>
    </main>
  )
}
