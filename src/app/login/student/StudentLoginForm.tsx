'use client'

import { studentLogin } from '@/lib/actions'
import { useState } from 'react'

type Competition = { id: number; name: string }

export default function StudentLoginForm({ competitions }: { competitions: Competition[] }) {
  const [error, setError] = useState('')

  async function handleSubmit(formData: FormData) {
    setError('')
    const result = await studentLogin(formData)
    if (result?.error) setError(result.error)
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-4">
      <select
        name="competitionId"
        required
        defaultValue=""
        className="border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal bg-white"
      >
        <option value="" disabled>Select your competition</option>
        {competitions.map((c) => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>
      <input
        name="loginCode"
        type="text"
        placeholder="Login Code (e.g. FRUITS-APPLE)"
        required
        className="border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal uppercase"
      />
      <input
        name="password"
        type="password"
        placeholder="Password"
        required
        className="border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal"
      />
      {error && <p className="text-red-500 text-sm">{error}</p>}
      <button type="submit" className="btn-metal btn-orange py-2.5 text-sm">
        Log in
      </button>
    </form>
  )
}
