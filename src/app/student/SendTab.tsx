'use client'

import { useState } from 'react'
import { sendWizCoins } from '@/lib/student-actions'
import { useBalance } from './BalanceContext'

type Group = { id: number; name: string; balance: number }
type Recipient = number | 'store'

export default function SendTab({
  otherGroups,
  onSent,
}: {
  otherGroups: Group[]
  onSent: (entry: { id: string; type: 'sent'; description: string; otherGroup: string; amount: number; message?: string | null; createdAt: Date }) => void
}) {
  const { balance, spend, rollback, active, setActive } = useBalance()
  const [selectedId, setSelectedId] = useState<Recipient | null>(null)
  const [amount, setAmount] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Switching wallets drops any selection the new wallet cannot pay, without
  // needing to reset state on every toggle.
  const validForWallet =
    selectedId === null ? null
    : active === 'personal' ? (selectedId === 'store' ? null : selectedId)
    : (selectedId === 'store' ? selectedId : null)

  const isStore = validForWallet === 'store'
  const selected = otherGroups.find(g => g.id === validForWallet)
  const selectedName = isStore ? 'MAIN STORE' : (selected?.name ?? '')
  const parsedAmount = parseInt(amount) || 0
  // The two wallets have disjoint reach. Business pays MAIN STORE and nothing
  // else; personal buys from businesses and never the store. Each wallet is
  // shown only its own targets, so an impossible payment can't be composed.
  const isPersonalWallet = active === 'personal'
  const canSend = validForWallet !== null && parsedAmount >= 1 && parsedAmount <= balance

  // Accents follow the active wallet so the whole Send panel reads as one color.
  const isPersonal = isPersonalWallet
  const accentSel = isPersonal ? 'border-teal bg-teal/[0.06]' : 'border-orange bg-orange/[0.06]'
  const accentCheck = isPersonal ? 'text-teal' : 'text-orange'
  const accentFocus = isPersonal ? 'focus:border-teal' : 'focus:border-orange'
  const accentText = isPersonal ? 'text-teal' : 'text-orange'
  const accentTextDark = isPersonal ? 'text-teal-dark' : 'text-orange-dark'
  const accentBtn = isPersonal ? 'bg-teal hover:bg-teal-dark' : 'bg-orange hover:bg-orange-dark'

  function pick(id: Recipient) {
    setSelectedId(id)
    setError('')
    setSuccess('')
  }


  async function handleSend() {
    if (!canSend || validForWallet === null) return
    // Capture before any async gap
    const sentAmount = parsedAmount
    const target = validForWallet
    const sentToName = selectedName
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
      const result = await sendWizCoins(target, sentAmount, sentMessage, active)
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

      {/* Recipient picker — each wallet sees only what it may pay */}
      <div>
        <div className="flex items-baseline justify-between gap-3 mb-2">
          <p className="text-sm font-semibold text-gray-600">Send to</p>
          <p className="text-xs text-gray-400">
            {isPersonalWallet ? 'Personal wallet · businesses only' : 'Business wallet · MAIN STORE only'}
          </p>
        </div>

        {isPersonalWallet ? (
          <div className="grid grid-cols-2 gap-2">
            {[...otherGroups].sort((a, b) => a.name.localeCompare(b.name)).map(g => (
              <button
                key={g.id}
                onClick={() => pick(g.id)}
                className={`flex items-center justify-between px-4 py-3 rounded-xl border-2 text-left transition ${
                  validForWallet === g.id ? accentSel : 'border-gray-200 bg-white hover:border-ink/15'
                }`}
              >
                <span className="font-semibold text-gray-800 text-sm">{g.name}</span>
                {validForWallet === g.id && <span className={`${accentCheck} text-lg`}>✓</span>}
              </button>
            ))}
          </div>
        ) : (
          <button
            onClick={() => pick('store')}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 text-left transition ${
              isStore ? accentSel : 'border-gray-200 bg-white hover:border-ink/15'
            }`}
          >
            <span>
              <span className="font-semibold text-gray-800 text-sm">🏪 MAIN STORE</span>
              <span className="block text-xs text-gray-400">Central store · business expense</span>
            </span>
            {isStore && <span className={`${accentCheck} text-lg`}>✓</span>}
          </button>
        )}

        <p className="text-xs text-gray-400 mt-2">
          {isPersonalWallet ? (
            <>Paying MAIN STORE? <button onClick={() => setActive('business')} className="text-orange font-medium hover:underline">Switch to Team Business</button></>
          ) : (
            <>Buying from another business? <button onClick={() => setActive('personal')} className="text-teal font-medium hover:underline">Switch to Personal</button></>
          )}
        </p>
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
            className={`w-full bg-white border-2 border-gray-200 ${accentFocus} rounded-xl px-4 py-3 text-2xl font-bold ${accentText} focus:outline-none`}
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
          className="w-full bg-white border-2 border-gray-200 focus:border-orange rounded-xl px-4 py-3 text-sm focus:outline-none"
        />
      </div>

      {/* Summary + Send */}
      {validForWallet !== null && parsedAmount > 0 && (
        <div className={`bg-paper-2 border border-ink/15 rounded-xl px-4 py-3 text-sm ${accentTextDark}`}>
          Sending <span className="font-bold">{parsedAmount.toLocaleString()} WizCoins</span> to <span className="font-bold">{selectedName}</span>
          {message && <> with message: &quot;<em>{message}</em>&quot;</>}
        </div>
      )}

      {error && <p className="text-sm text-red-500 font-medium">{error}</p>}
      {success && <p className="text-sm text-green-600 font-semibold">{success}</p>}

      <button
        onClick={handleSend}
        disabled={!canSend}
        className={`w-full ${accentBtn} text-white text-lg font-extrabold py-4 rounded-2xl transition disabled:opacity-40 disabled:cursor-not-allowed shadow-sm`}
      >
        💸 Send WizCoins
      </button>
    </div>
  )
}
