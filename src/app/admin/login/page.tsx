'use client'

import { useState } from 'react'
import { adminLogin } from '@/lib/admin-actions'

export default function AdminLoginPage() {
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    setError('')
    const result = await adminLogin(formData)
    if (result?.error) { setError(result.error); setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-paper-2 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-md p-8 w-full max-w-sm">
        <h1 className="text-2xl font-bold text-orange mb-1">WizBiz Admin</h1>
        <p className="text-sm text-gray-400 mb-6">Enter your admin password to continue</p>
        <form action={handleSubmit} className="flex flex-col gap-4">
          <input
            name="password"
            type="password"
            placeholder="Admin password"
            required
            className="border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal"
          />
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="bg-orange text-white rounded-lg py-2 font-semibold hover:bg-orange-dark transition disabled:opacity-50"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
