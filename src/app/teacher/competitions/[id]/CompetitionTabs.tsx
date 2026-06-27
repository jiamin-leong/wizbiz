'use client'

import { useState } from 'react'
import GroupsTable from './GroupsTable'
import ListingApprovalQueue from './ListingApprovalQueue'

type Student = { id: number; loginCode: string; groupId: number }
type Group = { id: number; name: string; balance: number; groupPassword: string; students: Student[] }
type Listing = { id: number; name: string; description: string | null; price: number; quantity: number; groupId: number }

export default function CompetitionTabs({
  groups,
  initialBalance,
  listings,
  groupNameMap,
}: {
  groups: Group[]
  initialBalance: number
  listings: Listing[]
  groupNameMap: Record<number, string>
}) {
  const [tab, setTab] = useState<'groups' | 'marketplace'>('groups')

  return (
    <div>
      <div className="flex gap-1 border-b border-gray-200 mb-6">
        {(['groups', 'marketplace'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition flex items-center gap-1.5 capitalize ${
              tab === t
                ? 'border-amber-500 text-amber-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t === 'groups' ? 'Groups' : 'Marketplace'}
            {t === 'marketplace' && listings.length > 0 && (
              <span className="bg-red-100 text-red-600 text-xs font-semibold px-1.5 py-0.5 rounded-full">
                {listings.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === 'groups' && (
        <GroupsTable groups={groups} initialBalance={initialBalance} />
      )}
      {tab === 'marketplace' && (
        <div>
          <h2 className="text-lg font-semibold text-gray-700 mb-3">
            Marketplace Listings
            {listings.length > 0 && (
              <span className="ml-2 bg-red-100 text-red-600 text-xs font-medium px-2 py-0.5 rounded-full">
                {listings.length} pending
              </span>
            )}
          </h2>
          <ListingApprovalQueue listings={listings} groupNameMap={groupNameMap} />
        </div>
      )}
    </div>
  )
}
