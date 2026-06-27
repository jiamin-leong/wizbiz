'use client'

import { useState } from 'react'

export default function StudentTabs({
  sendTab,
  marketplaceTab,
  myListingsTab,
  historyTab,
  pendingCount,
}: {
  sendTab: React.ReactNode
  marketplaceTab: React.ReactNode
  myListingsTab: React.ReactNode
  historyTab: React.ReactNode
  pendingCount: number
}) {
  const [tab, setTab] = useState<'send' | 'marketplace' | 'listings' | 'history'>('send')

  const tabClass = (t: string) =>
    `px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition ${
      tab === t
        ? 'border-amber-500 text-amber-600'
        : 'border-transparent text-gray-500 hover:text-gray-700'
    }`

  return (
    <div>
      <div className="flex gap-1 border-b border-gray-200 mb-6">
        <button onClick={() => setTab('send')} className={tabClass('send')}>
          💸 Send
        </button>
        <button onClick={() => setTab('marketplace')} className={tabClass('marketplace')}>
          🏪 Marketplace
        </button>
        <button onClick={() => setTab('listings')} className={`${tabClass('listings')} flex items-center gap-1.5`}>
          📦 My Listings
          {pendingCount > 0 && (
            <span className="bg-yellow-100 text-yellow-700 text-xs font-semibold px-1.5 py-0.5 rounded-full">
              {pendingCount}
            </span>
          )}
        </button>
        <button onClick={() => setTab('history')} className={tabClass('history')}>
          📜 History
        </button>
      </div>

      {tab === 'send' && sendTab}
      {tab === 'marketplace' && marketplaceTab}
      {tab === 'listings' && myListingsTab}
      {tab === 'history' && historyTab}
    </div>
  )
}
