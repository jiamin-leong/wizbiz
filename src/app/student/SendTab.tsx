'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { sendWizCoins } from '@/lib/student-actions'

type Group = { id: number; name: string; balance: number }

export default function SendTab({
  otherGroups,
  myBalance: initialBalance,
}: {
  otherGroups: Group[]
  myBalance: number
}) {
  const router = useRouter()
  const [balance, setBalance] = useState(initialBalance)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [amount, setAmount] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const selected = otherGroups.find(g => g.id === selectedId)
  const parsedAmount = parseInt(amount) || 0
  const canSend = selectedId && parsedAmount >= 1 && parsedAmount <= balance

  async function handleSend() {
    if (!canSend || !selectedId) return
    setSending(true)
    setError('')
    setSuccess('')
    const result = await sendWizCoins(selectedId, parsedAmount, message)
    setSending(false)
    if (result?.error) {
      setError(result.error)
    } else {
      // Optimistic update — instant feedback
      setBalance(b => b - parsedAmount)
      setSuccess(`Sent ${parsedAmount.toLocaleString()} WizCoins to ${selected?.name}!`)
      setSelectedId(null)
      setAmount('')
      setMessage('')
      // Background sync
      router.refresh()
    }
  }

  return (
    <div className="max-w-lg mx-auto flex flex-col gap-5">

      {/* Group picker */}
      <div>
        <p className="text-sm font-semibold text-gray-600 mb-2">Send to which group?</p>
        <div className="grid grid-cols-2 gap-2">
          {otherGroups.map(g => (
            <button
              key={g.id}
              onClick={() => { setSelectedId(g.id); setError(''); setSuccess('') }}
              className={`flex items-center justify-between px-4 py-3 rounded-xl border-2 text-left transition ${
                selectedId === g.id
                  ? 'border-amber-500 bg-amber-50'
                  : 'border-gray-200 bg-white hover:border-amber-300'
              }`}
            >
              <span className="font-semibold text-gray-800 text-sm">{g.name}</span>
              {selectedId === g.id && <span className="text-amber-500 text-lg">✓</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Amount */}
      <div>
        <p className="text-sm font-semibold text-gray-600 mb-2">How many WizCoins?</p>
        <div className="relative">
          <input
            type="number"
            min="1"
            max={myBalance}
            value={amount}
            onChange={e => { setAmount(e.target.value); setError(''); setSuccess('') }}
            placeholder="e.g. 500"
            className="w-full bg-white border-2 border-gray-200 focus:border-amber-400 rounded-xl px-4 py-3 text-2xl font-bold text-amber-600 focus:outline-none"
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-400 font-medium">WC</span>
        </div>
        <p className="text-xs text-gray-400 mt-1">You have {balance.toLocaleString()} WizCoins available</p>
      </div>

      {/* Message */}
      <div>
        <p className="text-sm font-semibold text-gray-600 mb-2">Message (optional)</p>
        <input
          type="text"
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder="e.g. Payment for cookies 🍪"
          maxLength={100}
          className="w-full bg-white border-2 border-gray-200 focus:border-amber-400 rounded-xl px-4 py-3 text-sm focus:outline-none"
        />
      </div>

      {/* Summary + Send */}
      {selected && parsedAmount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
          Sending <span className="font-bold">{parsedAmount.toLocaleString()} WizCoins</span> to <span className="font-bold">{selected.name}</span>
          {message && <> with message: "<em>{message}</em>"</>}
        </div>
      )}

      {error && <p className="text-sm text-red-500 font-medium">{error}</p>}
      {success && <p className="text-sm text-green-600 font-semibold">{success}</p>}

      <button
        onClick={handleSend}
        disabled={!canSend || sending}
        className="w-full bg-amber-500 hover:bg-amber-600 text-white text-lg font-extrabold py-4 rounded-2xl transition disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
      >
        {sending ? 'Sending…' : '💸 Send WizCoins'}
      </button>
    </div>
  )
}
