'use client'

import { useState } from 'react'
import { launchRound1 } from '@/lib/programme-actions'

function toDateInput(d: Date | null) {
  return d ? new Date(d).toISOString().slice(0, 10) : ''
}

export default function LaunchRound1Form({
  programmeId,
  classCount,
  teamCount,
  studentCount,
  settings,
}: {
  programmeId: number
  classCount: number
  teamCount: number
  studentCount: number
  settings: {
    startDate: Date | null
    endDate: Date | null
    groupCapital: number | null
    personalStartingBalance: number | null
  }
}) {
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  // The rules were set when the programme was created; launching confirms
  // them rather than asking again.
  const [editing, setEditing] = useState(
    !settings.startDate || !settings.endDate || !settings.groupCapital
  )

  async function handleSubmit(formData: FormData) {
    setError('')
    setSubmitting(true)
    const result = await launchRound1(programmeId, formData)
    if (result?.error) {
      setError(result.error)
      setSubmitting(false)
    }
  }

  const dates = settings.startDate && settings.endDate
    ? `${new Date(settings.startDate).toLocaleDateString()} → ${new Date(settings.endDate).toLocaleDateString()}`
    : 'not set'

  return (
    <form action={handleSubmit} className="bg-white rounded-xl shadow-sm p-6 mb-8 flex flex-col gap-4">
      <div>
        <p className="text-sm font-semibold text-gray-700">Launch round 1</p>
        <p className="text-xs text-gray-400 mt-0.5">
          Creates {classCount} class hackathons, {teamCount} teams and {studentCount} student logins.
          This cannot be undone from here.
        </p>
      </div>

      {editing ? (
        <>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-600 mb-1">Start date</label>
              <input name="startDate" type="date" required defaultValue={toDateInput(settings.startDate)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal" />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-600 mb-1">End date</label>
              <input name="endDate" type="date" required defaultValue={toDateInput(settings.endDate)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal" />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 rounded-xl border-2 border-orange/30 bg-orange/[0.04] p-3">
              <label htmlFor="groupCapital" className="block text-sm font-semibold text-orange-dark">
                🏢 Business capital <span className="font-normal text-gray-500">· per team</span>
              </label>
              <input id="groupCapital" name="groupCapital" type="number" min="1" required
                defaultValue={settings.groupCapital ?? 1000}
                className="w-full mt-2 border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange" />
            </div>
            <div className="flex-1 rounded-xl border-2 border-teal/30 bg-teal/[0.04] p-3">
              <label htmlFor="personalStartingBalance" className="block text-sm font-semibold text-teal-dark">
                👤 Personal wallet <span className="font-normal text-gray-500">· per student</span>
              </label>
              <input id="personalStartingBalance" name="personalStartingBalance" type="number" min="0"
                defaultValue={settings.personalStartingBalance ?? 0}
                className="w-full mt-2 border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal" />
            </div>
          </div>
        </>
      ) : (
        <div className="rounded-xl border border-ink/10 bg-paper-2 p-4">
          <div className="flex items-start justify-between gap-3">
            <dl className="text-sm grid gap-1.5">
              <div className="flex gap-2">
                <dt className="text-gray-500 w-36">Dates</dt>
                <dd className="font-semibold text-gray-800">{dates}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-gray-500 w-36">Business capital</dt>
                <dd className="font-semibold text-orange-dark">
                  {settings.groupCapital?.toLocaleString()} <span className="font-normal text-gray-400">per team</span>
                </dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-gray-500 w-36">Personal wallet</dt>
                <dd className="font-semibold text-teal-dark">
                  {(settings.personalStartingBalance ?? 0).toLocaleString()} <span className="font-normal text-gray-400">per student</span>
                </dd>
              </div>
            </dl>
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="shrink-0 text-sm text-gray-500 hover:text-orange border border-gray-200 hover:border-ink/15 px-3 py-1.5 rounded-lg transition"
            >
              ✏ Change
            </button>
          </div>
        </div>
      )}

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <button type="submit" disabled={submitting}
        className="btn-metal btn-orange py-2.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed">
        {submitting ? 'Launching…' : `Launch round 1 for ${classCount} classes`}
      </button>
    </form>
  )
}
