'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { addCoOrganizer, removeCoOrganizer } from '@/lib/teacher-actions'

type CoOrg = { id: number; name: string; email: string }

export default function CoOrganizers({
  competitionId,
  coOrganizers,
  isOwner,
}: {
  competitionId: number
  coOrganizers: CoOrg[]
  isOwner: boolean
}) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [adding, setAdding] = useState(false)

  async function handleAdd() {
    if (!email.trim()) return
    setAdding(true)
    setError('')
    const result = await addCoOrganizer(competitionId, email.trim())
    setAdding(false)
    if (result && 'error' in result) {
      setError(result.error)
    } else {
      setEmail('')
      router.refresh()
    }
  }

  async function handleRemove(teacherId: number) {
    await removeCoOrganizer(competitionId, teacherId)
    router.refresh()
  }

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-700 mb-4">Co-organisers</h2>

      {coOrganizers.length === 0 ? (
        <p className="text-sm text-gray-400 mb-4">No co-organisers yet.</p>
      ) : (
        <div className="bg-white rounded-xl shadow-sm divide-y divide-gray-50 mb-4">
          {coOrganizers.map(t => (
            <div key={t.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-sm font-medium text-gray-700">{t.name}</p>
                <p className="text-xs text-gray-400">{t.email}</p>
              </div>
              {isOwner && (
                <button
                  onClick={() => handleRemove(t.id)}
                  className="text-xs text-gray-400 hover:text-red-500 transition px-2 py-1 rounded hover:bg-red-50"
                >
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {isOwner && (
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-sm font-medium text-gray-700 mb-2">Add co-organiser by email</p>
          <div className="flex gap-2">
            <input
              type="email"
              value={email}
              onChange={e => { setEmail(e.target.value); setError('') }}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              placeholder="teacher@school.com"
              className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal"
            />
            <button
              onClick={handleAdd}
              disabled={adding || !email.trim()}
              className="bg-orange hover:bg-orange-dark text-white text-sm font-medium px-4 py-2 rounded-lg transition disabled:opacity-50"
            >
              {adding ? 'Adding…' : 'Add'}
            </button>
          </div>
          {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
          <p className="text-xs text-gray-400 mt-2">They must already have a WizBiz teacher account.</p>
        </div>
      )}
    </div>
  )
}
