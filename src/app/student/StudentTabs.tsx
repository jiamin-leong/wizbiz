'use client'

import { useState } from 'react'

export default function StudentTabs({
  sendTab,
  marketplaceTab,
  myListingsTab,
  pendingCount,
}: {
  sendTab: React.ReactNode
  marketplaceTab: React.ReactNode
  myListingsTab: React.ReactNode
  pendingCount: number
}) {
  const [tab, setTab] = useState<'send' | 'marketplace' | 'listings'>('send')

  return (
    <div>
      <div className="flex gap-1 border-b border-gray-200 mb-6">
        <button
          onClick={() => setTab('send')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition ${
            tab === 'send'
              ? 'border-amber-500 text-amber-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          💸 Send
        </button>
        <button
          onClick={() => setTab('marketplace')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition ${
            tab === 'marketplace'
              ? 'border-amber-500 text-amber-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          🏪 Marketplace
        </button>
        <button
          onClick={() => setTab('listings')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition flex items-center gap-1.5 ${
            tab === 'listings'
              ? 'border-amber-500 text-amber-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          📦 My Listings
          {pendingCount > 0 && (
            <span className="bg-yellow-100 text-yellow-700 text-xs font-semibold px-1.5 py-0.5 rounded-full">
              {pendingCount}
            </span>
          )}
        </button>
      </div>

      {tab === 'send' && sendTab}
      {tab === 'marketplace' && marketplaceTab}
      {tab === 'listings' && myListingsTab}
    </div>
  )
}
