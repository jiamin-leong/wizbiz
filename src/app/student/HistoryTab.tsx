'use client'

import { useBalance } from './BalanceContext'

export type HistoryEntry = {
  id: string
  type: 'bought' | 'sold' | 'sent' | 'received'
  wallet: 'personal' | 'business'
  /** Login code of the teammate who paid, for business-wallet payments. */
  by?: string | null
  description: string
  otherGroup: string
  amount: number
  message?: string | null
  createdAt: Date
}

const typeConfig = {
  bought:   { label: 'Bought',   sign: '-', color: 'text-red-500',   bg: 'bg-red-50',   icon: '🛍️' },
  sold:     { label: 'Sold',     sign: '+', color: 'text-green-600', bg: 'bg-green-50', icon: '💰' },
  sent:     { label: 'Sent',     sign: '-', color: 'text-red-500',   bg: 'bg-red-50',   icon: '💸' },
  received: { label: 'Received', sign: '+', color: 'text-green-600', bg: 'bg-green-50', icon: '📥' },
}

const walletBadge = {
  personal: { label: '👤 My Wallet', cls: 'bg-teal/15 text-teal-dark' },
  business: { label: '🏢 Team Business', cls: 'bg-orange/15 text-orange-dark' },
}

export default function HistoryTab({ entries: allEntries }: { entries: HistoryEntry[] }) {
  // The wallet picked in "Spending from" decides which history is shown.
  const { active } = useBalance()
  const entries = allEntries.filter(e => e.wallet === active)

  if (allEntries.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <p className="text-4xl mb-3">📜</p>
        <p className="font-medium">No transactions yet</p>
        <p className="text-sm mt-1">Buy something or send WizCoins to get started!</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {entries.length === 0 && (
        <p className="text-center text-sm text-gray-400 py-10">Nothing in this wallet yet.</p>
      )}
      {entries.map(e => {
        const cfg = typeConfig[e.type]
        return (
          <div key={e.id} className="bg-white rounded-2xl shadow-sm px-5 py-4 flex items-center gap-4">
            <div className={`w-10 h-10 rounded-full ${cfg.bg} flex items-center justify-center text-lg shrink-0`}>
              {cfg.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{cfg.label}</span>
                <span className="text-xs text-gray-400">·</span>
                <span className="text-xs text-gray-400">{e.otherGroup}</span>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${walletBadge[e.wallet].cls}`}>
                  {walletBadge[e.wallet].label}
                </span>
                {e.by && <span className="text-[10px] text-gray-400">paid by {e.by}</span>}
              </div>
              <p className="text-sm font-semibold text-gray-800 truncate">{e.description}</p>
              {e.message && (
                <p className="text-xs text-gray-400 italic truncate">"{e.message}"</p>
              )}
            </div>
            <div className="text-right shrink-0">
              <p className={`text-base font-extrabold ${cfg.color}`}>
                {cfg.sign}{e.amount.toLocaleString()}
              </p>
              <p className="text-xs text-gray-400">WC</p>
              <p className="text-xs text-gray-300 mt-0.5">
                {new Date(e.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
