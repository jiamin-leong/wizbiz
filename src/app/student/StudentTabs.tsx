'use client'

import { useState } from 'react'
import SendTab from './SendTab'
import HistoryTab, { type HistoryEntry } from './HistoryTab'
import { useBalance } from './BalanceContext'

type Group = { id: number; name: string; balance: number }

export default function StudentTabs({
  otherGroups,
  initialHistory,
}: {
  otherGroups: Group[]
  initialHistory: HistoryEntry[]
}) {
  const [tab, setTab] = useState<'send' | 'history'>('send')
  const [history, setHistory] = useState<HistoryEntry[]>(initialHistory)
  const { active, setActive } = useBalance()

  function addHistory(entry: HistoryEntry) {
    setHistory(h => [entry, ...h])
  }

  const pill = (w: 'personal' | 'business') => {
    const on = active === w
    const onClass = w === 'personal' ? 'bg-teal text-white' : 'bg-orange text-white'
    return `px-3 py-1.5 text-sm font-semibold rounded-full transition ${
      on ? onClass : 'text-ink-soft hover:text-ink'
    }`
  }

  const panelTint =
    active === 'personal' ? 'border-teal bg-teal/[0.04]' : 'border-orange bg-orange/[0.04]'

  const tabClass = (t: string) =>
    `px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition ${
      tab === t
        ? 'border-orange text-orange'
        : 'border-transparent text-gray-500 hover:text-gray-700'
    }`

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-5">
        <span className="text-xs font-semibold text-ink-soft">Spending from:</span>
        <div className="inline-flex items-center rounded-full border-2 border-ink/10 bg-white p-0.5">
          <button type="button" onClick={() => setActive('personal')} className={pill('personal')}>
            👤 My Wallet
          </button>
          <button type="button" onClick={() => setActive('business')} className={pill('business')}>
            🏢 Team Business
          </button>
        </div>
        <span className="text-xs text-ink-soft">
          {active === 'business'
            ? '· shared — your whole team sees this'
            : '· personal — just you'}
        </span>
      </div>

      <div className="flex gap-1 border-b border-gray-200 mb-6">
        <button onClick={() => setTab('send')} className={tabClass('send')}>
          💸 Send
        </button>
        <button onClick={() => setTab('history')} className={tabClass('history')}>
          📜 History
        </button>
      </div>

      {tab === 'send' && (
        <div className={`rounded-xl border-l-4 pl-4 py-3 transition-colors ${panelTint}`}>
          <SendTab otherGroups={otherGroups} onSent={addHistory} />
        </div>
      )}
      {tab === 'history' && <HistoryTab entries={history} />}
    </div>
  )
}
