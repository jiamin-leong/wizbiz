'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { updateCompetition } from '@/lib/teacher-actions'

function toDateInput(date: Date) {
  return new Date(date).toISOString().slice(0, 10)
}

export default function CompetitionHeader({
  competition,
  totalGroups,
  totalStudents,
  totalDays,
}: {
  competition: {
    id: number
    name: string
    startDate: Date
    endDate: Date
    initialBalance: number
    status: string
  }
  totalGroups: number
  totalStudents: number
  totalDays: number
}) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(competition.name)
  const [startDate, setStartDate] = useState(toDateInput(competition.startDate))
  const [endDate, setEndDate] = useState(toDateInput(competition.endDate))
  const [saving, setSaving] = useState(false)

  const previewDays = Math.ceil(
    (new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)
  )

  async function handleSave() {
    if (!name.trim()) return
    setSaving(true)
    await updateCompetition(competition.id, name.trim(), startDate, endDate)
    setSaving(false)
    setEditing(false)
    router.refresh()
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
      <div className="flex justify-between items-start mb-5">
        {editing ? (
          <input
            autoFocus
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Escape' && setEditing(false)}
            className="text-3xl font-extrabold text-gray-900 border-b-2 border-amber-400 focus:outline-none bg-transparent w-full mr-4"
          />
        ) : (
          <h1 className="text-3xl font-extrabold text-gray-900">{name}</h1>
        )}
        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
            competition.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
          }`}>
            {competition.status}
          </span>
          {editing ? (
            <>
              <button
                onClick={handleSave}
                disabled={saving}
                className="text-sm font-semibold bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 rounded-lg transition disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button
                onClick={() => { setEditing(false); setName(competition.name); setStartDate(toDateInput(competition.startDate)); setEndDate(toDateInput(competition.endDate)) }}
                className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg border border-gray-200 transition"
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              onClick={() => setEditing(true)}
              className="text-sm text-gray-500 hover:text-amber-600 border border-gray-200 hover:border-amber-300 px-3 py-1.5 rounded-lg transition"
            >
              ✏ Edit
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <div className="col-span-2 sm:col-span-2 bg-amber-50 rounded-xl p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Duration</p>
          {editing ? (
            <div className="flex items-center gap-2 mt-1">
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="border border-amber-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-amber-400 bg-white"
              />
              <span className="text-gray-400 text-sm">→</span>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="border border-amber-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-amber-400 bg-white"
              />
            </div>
          ) : (
            <>
              <p className="text-base font-bold text-gray-800">
                {new Date(competition.startDate).toLocaleDateString()} → {new Date(competition.endDate).toLocaleDateString()}
              </p>
              <p className="text-sm text-amber-500 font-medium mt-0.5">{totalDays} days</p>
            </>
          )}
          {editing && previewDays > 0 && (
            <p className="text-xs text-amber-500 mt-1">{previewDays} days</p>
          )}
        </div>
        <div className="bg-amber-50 rounded-xl p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Groups</p>
          <p className="text-3xl font-extrabold text-amber-600">{totalGroups}</p>
        </div>
        <div className="bg-amber-50 rounded-xl p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Students</p>
          <p className="text-3xl font-extrabold text-amber-600">{totalStudents}</p>
        </div>
        <div className="bg-amber-50 rounded-xl p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Starting Balance</p>
          <p className="text-xl font-extrabold text-amber-600">{competition.initialBalance.toLocaleString()}</p>
          <p className="text-xs text-gray-400 mt-0.5">WizCoins</p>
        </div>
      </div>
    </div>
  )
}
