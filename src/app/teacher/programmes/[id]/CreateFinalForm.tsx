'use client'

import { useState } from 'react'
import { createMasterHackathon } from '@/lib/programme-actions'

export default function CreateFinalForm({
  programmeId,
  finalistCount,
  spectatorCount,
}: {
  programmeId: number
  finalistCount: number
  spectatorCount: number
}) {
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(formData: FormData) {
    setError('')
    setSubmitting(true)
    const result = await createMasterHackathon(programmeId, formData)
    if (result?.error) {
      setError(result.error)
      setSubmitting(false)
    }
  }

  return (
    <form action={handleSubmit} className="bg-white rounded-xl shadow-sm p-6 flex flex-col gap-4">
      <div>
        <p className="text-sm font-semibold text-gray-700">Create the final</p>
        <p className="text-xs text-gray-400 mt-0.5">
          {finalistCount} confirmed teams enter with the same members, the same login codes and the
          same passwords. Business and personal balances carry forward from round 1.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-600 mb-1">Name</label>
        <input name="name" type="text" defaultValue="Master Hackathon"
          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal" />
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

      <div className="rounded-xl border border-ink/10 bg-paper-2 p-3">
        <p className="text-sm font-semibold text-gray-700 mb-0.5">Carried balances</p>
        <p className="text-xs text-gray-500 mb-3">
          Each team opens the final on its round 1 closing balance, and each student keeps their
          personal wallet. Round 2 profit is measured from there, so the final scores the final.
          Add an optional top-up on entry.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <label htmlFor="topUp" className="block text-xs font-medium text-gray-600 mb-1">
              Business top-up · per team
            </label>
            <input id="topUp" name="topUp" type="number" min="0" defaultValue={0}
              className="w-full border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange" />
          </div>
          <div className="flex-1">
            <label htmlFor="personalTopUp" className="block text-xs font-medium text-gray-600 mb-1">
              Personal top-up · per student
            </label>
            <input id="personalTopUp" name="personalTopUp" type="number" min="0" defaultValue={0}
              className="w-full border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal" />
          </div>
        </div>
      </div>

      <div className="rounded-xl border-2 border-orange/30 bg-orange/[0.04] p-3">
        <label className="flex items-start gap-2.5 cursor-pointer">
          <input type="checkbox" name="includeSpectators" defaultChecked className="accent-orange w-4 h-4 mt-0.5" />
          <span>
            <span className="text-sm font-semibold text-orange-dark">
              👥 Bring the other {spectatorCount} students in as spectators
            </span>
            <span className="block text-xs text-gray-500 mt-0.5">
              Everyone whose team did not reach the final keeps their round 1 personal wallet and the
              same login, so they can keep buying from the finalists. Their business wallets are zeroed
              and they cannot sell or be paid — so a knocked-out team cannot bankroll a finalist.
              Without this, only the {finalistCount} finalist teams can trade.
            </span>
          </span>
        </label>
      </div>

      <div className="rounded-xl border-2 border-teal/30 bg-teal/[0.04] p-3">
        <p className="text-sm font-semibold text-teal-dark mb-0.5">⚖️ Judging panel</p>
        <p className="text-xs text-gray-500 mb-3">
          Judges get their own logins and a personal wallet to spend with the finalists. They cannot
          list items and cannot be paid, so their spending only ever moves money towards teams.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <label htmlFor="judgeCount" className="block text-xs font-medium text-gray-600 mb-1">
              Number of judges
            </label>
            <input id="judgeCount" name="judgeCount" type="number" min="0" max="8" defaultValue={4}
              className="w-full border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal" />
          </div>
          <div className="flex-1">
            <label htmlFor="judgeBalance" className="block text-xs font-medium text-gray-600 mb-1">
              WizCoins each
            </label>
            <input id="judgeBalance" name="judgeBalance" type="number" min="0" defaultValue={1000}
              className="w-full border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal" />
          </div>
        </div>
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <button type="submit" disabled={submitting}
        className="btn-metal btn-orange py-2.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed">
        {submitting ? 'Creating…' : `Create the final with ${finalistCount} teams`}
      </button>
    </form>
  )
}
