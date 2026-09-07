'use client'

import { useState } from 'react'
import GroupsTable from './GroupsTable'
import CoOrganizers from './CoOrganizers'
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
type CoOrg = { id: number; name: string; email: string }

type Tab = 'groups' | 'business' | 'standings' | 'settings'

export default function CompetitionTabs({
  groups,
  initialBalance,
  statements,
  competitionId,
  coOrganizers,
  isOwner,
  canManage,
  canAdvance,
  judgeCount,
  spectatorCount,
}: {
  groups: Group[]
  initialBalance: number
  statements: Statement[]
  competitionId: number
  coOrganizers: CoOrg[]
  isOwner: boolean
  canManage: boolean
  canAdvance: boolean
  judgeCount: number
  spectatorCount: number
}) {
  const [tab, setTab] = useState<Tab>('groups')

  const tabs: { key: Tab; label: string }[] = [
    { key: 'groups', label: 'Groups' },
    { key: 'business', label: 'Financials' },
    { key: 'standings', label: 'Standings' },
    { key: 'settings', label: 'Settings' },
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

      {tab === 'groups' && (
        <>
          {judgeCount > 0 && (
            <div className="mb-4 rounded-lg border-l-4 border-teal bg-teal/[0.06] px-4 py-3 text-sm text-ink-soft">
              <span className="font-semibold text-teal-dark">{judgeCount} judges. </span>
              Their logins are in the <span className="font-semibold">JUDGES</span> panel below. Judges
              spend from their personal wallet only — they cannot list items or receive payments.
            </div>
          )}
          {spectatorCount > 0 && (
            <div className="mb-4 rounded-lg border-l-4 border-orange bg-orange/[0.06] px-4 py-3 text-sm text-ink-soft">
              <span className="font-semibold text-orange-dark">{spectatorCount} spectators. </span>
              Students whose team did not reach the final, keeping their round 1 personal wallets so they
              can buy from the finalists. Same login codes as round 1. They cannot sell or be paid, and
              their business wallets are zeroed so no knocked-out team can bankroll a finalist.
            </div>
          )}
          <GroupsTable groups={groups} initialBalance={initialBalance} canManage={canManage} />
        </>
      )}
      {tab === 'business' && (
        <BusinessStatements statements={statements} />
      )}
      {tab === 'standings' && (
        <Standings statements={statements} competitionId={competitionId} canAdvance={canAdvance} />
      )}
      {tab === 'settings' && (
        <CoOrganizers
          competitionId={competitionId}
          coOrganizers={coOrganizers}
          isOwner={isOwner}
        />
      )}
    </div>
  )
}
