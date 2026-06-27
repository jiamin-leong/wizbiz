'use client'

import { useState } from 'react'
import { sendWizCoins } from '@/lib/student-actions'
import { useBalance } from './BalanceContext'

type Group = { id: number; name: string; balance: number }

export default function SendTab({
  otherGroups,
  onSent,
}: {
  otherGroups: Group[]
  onSent: (entry: { id: string; type: 'sent'; description: string; otherGroup: string; amount: number; message?: string | null; createdAt: Date }) => void
}) {
  const { balance, spend, rollback } = useBalance()
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [amount, setAmount] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const selected = otherGroups.find(g => g.id === selectedId)
  const parsedAmount = parseInt(amount) || 0
  const canSend = selectedId && parsedAmount >= 1 && parsedAmount <= balance

  async function handleSend() {
    if (!canSend || !selectedId) return
    // Capture before any async gap
    const sentAmount = parsedAmount
    const sentToName = selected?.name ?? ''
    const sentToId = selectedId
    const sentMessage = message

    spend(sentAmount)
    setSuccess(`Sent ${sentAmount.toLocaleString()} WizCoins to ${sentToName}!`)
    setSelectedId(null)
    setAmount('')
    setMessage('')
    setError('')
    onSent({
      id: `sent-optimistic-${Date.now()}`,
      type: 'sent',
      description: 'WizCoins sent',
      otherGroup: sentToName,
      amount: sentAmount,
      message: sentMessage || null,
      createdAt: new Date(),
    })

    try {
      const result = await sendWizCoins(sentToId, sentAmount, sentMessage)
      if (result?.error) {
        rollback(sentAmount)
        setSuccess('')
        setError(result.error)
      }
    } catch {
      rollback(sentAmount)
      setSuccess('')
      setError('Something went wrong. Please try again.')
    }
  }

  return (
    <div className="max-w-lg mx-auto flex flex-col gap-5">

      {/* Group picker */}
      <div>
        <p className="text-sm font-semibold text-gray-600 mb-2">Send to which group?</p>
        <div className="grid grid-cols-2 gap-2">
          {[...otherGroups].sort((a, b) => a.name.localeCompare(b.name)).map(g => (
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
            max={balance}
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
        disabled={!canSend}
        className="w-full bg-amber-500 hover:bg-amber-600 text-white text-lg font-extrabold py-4 rounded-2xl transition disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
      >
        💸 Send WizCoins
      </button>
    </div>
  )
}
