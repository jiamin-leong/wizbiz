'use client'

import { useState } from 'react'
import GroupsTable from './GroupsTable'
import BusinessStatements from './BusinessStatements'
import Standings from './Standings'
import { type Statement } from '@/lib/standings'

type Student = { id: number; loginCode: string; groupId: number; personalBalance: number }
type Group = {
  id: number
  name: string
  balance: number
  groupPassword: string
  kind: 'team' | 'judges' | 'spectators'
  students: Student[]
}
type Tab = 'groups' | 'business' | 'standings'

export default function CompetitionTabs({
  groups,
  initialBalance,
  statements,
  competitionId,
  canManage,
  canAdvance,
}: {
  groups: Group[]
  initialBalance: number
  statements: Statement[]
  competitionId: number
  canManage: boolean
  canAdvance: boolean
}) {
  const [tab, setTab] = useState<Tab>('groups')

  const tabs: { key: Tab; label: string }[] = [
    { key: 'groups', label: 'Teams' },
    { key: 'business', label: 'Financials' },
    { key: 'standings', label: 'Standings' },
  ]

  return (
    <div>
      <div className="flex gap-1 border-b border-gray-200 mb-6 overflow-x-auto">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition whitespace-nowrap ${
              tab === t.key ? 'border-orange text-orange' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
            {t.key === 'standings' && canAdvance && statements.some(s => s.qualified) && (
              <span className="ml-1.5 text-teal-dark">✓</span>
            )}
          </button>
        ))}
      </div>

      {/* The three roles are distinguished inside GroupsTable itself. */}
      {tab === 'groups' && (
        <GroupsTable groups={groups} initialBalance={initialBalance} canManage={canManage} />
      )}
      {tab === 'business' && (
        <BusinessStatements statements={statements} />
      )}
      {tab === 'standings' && (
        <Standings statements={statements} competitionId={competitionId} canAdvance={canAdvance} />
      )}
    </div>
  )
}
