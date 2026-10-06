'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { sendFromStore } from '@/lib/store-actions'
import type { StoreTeam } from '@/lib/main-store'

export default function StorePayoutForm({ teams }: { teams: StoreTeam[] }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [teamId, setTeamId] = useState('')
  const [amount, setAmount] = useState('')
  const [message, setMessage] = useState('')
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null)

  const multiCompetition = new Set(teams.map(t => t.competition)).size > 1
  const parsed = parseInt(amount)
  const canSend = teamId !== '' && Number.isInteger(parsed) && parsed >= 1 && !pending

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const team = teams.find(t => t.id === Number(teamId))
    startTransition(async () => {
      const res = await sendFromStore(Number(teamId), parsed, message)
      if ('error' in res && res.error) {
        setFeedback({ ok: false, text: res.error })
        return
      }
      setFeedback({ ok: true, text: `Sent ${parsed.toLocaleString()} WC to ${team?.name ?? 'team'}.` })
      setAmount('')
      setMessage('')
      router.refresh()
    })
  }

  return (
    <form onSubmit={submit} className="bg-white rounded-xl shadow-sm p-6 flex flex-col gap-4">
      <div>
        <h2 className="font-semibold text-gray-700">Pay a team from MAIN STORE</h2>
        <p className="text-xs text-gray-400 mt-0.5">Goes into the team&apos;s business wallet and counts as their revenue.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_8rem_1fr] gap-3">
        <select
          value={teamId}
          onChange={e => setTeamId(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
        >
          <option value="">Choose a team…</option>
          {teams.map(t => (
            <option key={t.id} value={t.id}>{multiCompetition ? `${t.competition} · ${t.name}` : t.name}</option>
          ))}
        </select>
        <input
          type="number"
          min={1}
          step={1}
          value={amount}
          onChange={e => setAmount(e.target.value)}
          placeholder="Amount"
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
        />
        <input
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder="Note (optional)"
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
        />
      </div>
      <div className="flex items-center gap-3">
        <button
          disabled={!canSend}
          className="text-sm font-semibold text-white bg-orange hover:bg-orange-dark disabled:opacity-40 px-4 py-2 rounded-lg transition"
        >
          {pending ? 'Sending…' : 'Send WizCoins'}
        </button>
        {feedback && (
          <p className={`text-sm ${feedback.ok ? 'text-teal-dark' : 'text-red-600'}`}>{feedback.text}</p>
        )}
      </div>
    </form>
  )
}
