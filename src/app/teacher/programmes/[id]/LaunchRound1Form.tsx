'use client'

import { useState } from 'react'
import { launchRound1 } from '@/lib/programme-actions'

export default function LaunchRound1Form({
  programmeId,
  classCount,
}: {
  programmeId: number
  classCount: number
}) {
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(formData: FormData) {
    setError('')
    setSubmitting(true)
    const result = await launchRound1(programmeId, formData)
    if (result?.error) {
      setError(result.error)
      setSubmitting(false)
    }
  }

  return (
    <form action={handleSubmit} className="bg-white rounded-xl shadow-sm p-6 mb-8 flex flex-col gap-4">
      <div>
        <p className="text-sm font-semibold text-gray-700">Launch round 1</p>
        <p className="text-xs text-gray-400 mt-0.5">
          Creates one hackathon for each of the {classCount} classes, with teams, logins and
          passwords. These rules apply to every class, so the classes stay comparable.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-600 mb-1">Start date</label>
          <input name="startDate" type="date" required
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal" />
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-600 mb-1">End date</label>
          <input name="endDate" type="date" required
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal" />
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 rounded-xl border-2 border-orange/30 bg-orange/[0.04] p-3">
          <label htmlFor="groupCapital" className="block text-sm font-semibold text-orange-dark">
            🏢 Business capital <span className="font-normal text-gray-500">· per team</span>
          </label>
          <p className="text-xs text-gray-500 mt-0.5 mb-2">
            A flat amount every team starts with, whatever its size.
          </p>
          <input id="groupCapital" name="groupCapital" type="number" min="1" defaultValue={1000} required
            className="w-full border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange" />
        </div>
        <div className="flex-1 rounded-xl border-2 border-teal/30 bg-teal/[0.04] p-3">
          <label htmlFor="personalStartingBalance" className="block text-sm font-semibold text-teal-dark">
            👤 Personal wallet <span className="font-normal text-gray-500">· per student</span>
          </label>
          <p className="text-xs text-gray-500 mt-0.5 mb-2">
            Each student&apos;s own spending money.
          </p>
          <input id="personalStartingBalance" name="personalStartingBalance" type="number" min="0" defaultValue={0}
            className="w-full border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal" />
        </div>
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <button type="submit" disabled={submitting}
        className="btn-metal btn-orange py-2.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed">
        {submitting ? 'Launching…' : `Launch round 1 for ${classCount} classes`}
      </button>
    </form>
  )
}
