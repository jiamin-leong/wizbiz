'use client'

import { useState } from 'react'
import SendTab from './SendTab'
import MarketplaceTab from './MarketplaceTab'
import MyListingsTab from './MyListingsTab'
import HistoryTab, { type HistoryEntry } from './HistoryTab'

type Group = { id: number; name: string; balance: number }
type Listing = { id: number; name: string; description: string | null; price: number; quantity: number; groupId: number; groupName: string }
type MyListing = { id: number; name: string; description: string | null; price: number; quantity: number; status: 'pending' | 'approved' | 'rejected' }

export default function StudentTabs({
  otherGroups,
  marketplaceListings,
  myListings,
  initialHistory,
  pendingCount,
}: {
  otherGroups: Group[]
  marketplaceListings: Listing[]
  myListings: MyListing[]
  initialHistory: HistoryEntry[]
  pendingCount: number
}) {
  const [tab, setTab] = useState<'send' | 'marketplace' | 'listings' | 'history'>('send')
  const [history, setHistory] = useState<HistoryEntry[]>(initialHistory)

  function addHistory(entry: HistoryEntry) {
    setHistory(h => [entry, ...h])
  }

  const tabClass = (t: string) =>
    `px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition ${
      tab === t
        ? 'border-orange text-orange'
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

      {tab === 'send' && (
        <SendTab otherGroups={otherGroups} onSent={addHistory} />
      )}
      {tab === 'marketplace' && (
        <MarketplaceTab listings={marketplaceListings} onBought={addHistory} />
      )}
      {tab === 'listings' && <MyListingsTab listings={myListings} />}
      {tab === 'history' && <HistoryTab entries={history} />}
    </div>
  )
}
