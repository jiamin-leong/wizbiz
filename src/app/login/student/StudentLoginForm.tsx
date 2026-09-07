'use client'

import { studentLogin } from '@/lib/actions'
import { useState } from 'react'

type Competition = { id: number; name: string }

export default function StudentLoginForm({ competitions }: { competitions: Competition[] }) {
  const [error, setError] = useState('')
  // Only shown when one login code matches more than one open competition.
  const [chooseFrom, setChooseFrom] = useState<Competition[] | null>(null)

  async function handleSubmit(formData: FormData) {
    setError('')
    const result = await studentLogin(formData)
    if (result?.chooseFrom) setChooseFrom(result.chooseFrom)
    if (result?.error) setError(result.error)
  }

  const options = chooseFrom ?? competitions

  return (
    <form action={handleSubmit} className="flex flex-col gap-4">
      <input
        name="loginCode"
        type="text"
        placeholder="Login code (e.g. BEAR)"
        required
        autoFocus
        className="border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal uppercase"
      />
      <input
        name="password"
        type="password"
        placeholder="Password (e.g. PULSE)"
        required
        className="border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal"
      />

      {chooseFrom ? (
        <select
          name="competitionId"
          required
          defaultValue={String(chooseFrom[0]?.id ?? '')}
          className="border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal bg-white"
        >
          {options.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      ) : (
        <input type="hidden" name="competitionId" value="" />
      )}

      {error && <p className="text-red-500 text-sm">{error}</p>}
      <button type="submit" className="btn-metal btn-orange py-2.5 text-sm">
        Log in
      </button>
    </form>
  )
}
