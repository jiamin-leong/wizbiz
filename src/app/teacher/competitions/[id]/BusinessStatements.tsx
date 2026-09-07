'use client'

import { useState } from 'react'
import { compareForAdvancement, type Statement } from '@/lib/standings'

export default function BusinessStatements({ statements }: { statements: Statement[] }) {
  const [topN, setTopN] = useState<number | null>(null)

  const view = topN
    ? [...statements].sort(compareForAdvancement).slice(0, topN)
    : [...statements].sort((a, b) => a.name.localeCompare(b.name))

  if (statements.length === 0) {
    return <p className="text-sm text-gray-400">No groups yet.</p>
  }

  const filterBtn = (n: number | null, label: string) =>
    `px-3 py-1.5 text-sm font-medium rounded-lg transition ${
      topN === n ? 'bg-orange text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-ink/15'
    }`

  return (
    <div className="print-area">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-1">
        <h2 className="text-lg font-semibold text-gray-700">Business Statements</h2>
        <div className="flex items-center gap-2 print-hide">
          <div className="flex items-center gap-1">
            <span className="text-xs font-medium text-ink-soft mr-1">Rank by profit:</span>
            <button onClick={() => setTopN(null)} className={filterBtn(null, 'All')}>All</button>
            <button onClick={() => setTopN(3)} className={filterBtn(3, 'Top 3')}>Top 3</button>
            <button onClick={() => setTopN(5)} className={filterBtn(5, 'Top 5')}>Top 5</button>
          </div>
          <button
            onClick={() => window.print()}
            className="text-sm text-orange border border-ink/15 hover:bg-paper-2 px-3 py-1.5 rounded-lg transition font-medium"
          >
            Export PDF
          </button>
        </div>
      </div>
      <div className="mb-4 max-w-2xl rounded-lg bg-white border border-gray-100 px-4 py-3 text-sm text-ink-soft leading-relaxed">
        <p className="mb-1">Each group is a business.</p>
        <ul className="space-y-0.5">
          <li><span className="font-semibold text-teal-dark">Revenue</span> — WizCoins received from customers.</li>
          <li><span className="font-semibold text-red-500">Business expenses</span> — payments to MAIN STORE.</li>
          <li><span className="font-semibold text-gray-800">Profit / Loss</span> — cash on hand minus starting capital.</li>
        </ul>
        <li><span className="font-semibold text-gray-800">Profit per member</span> — shown for context; teams are ranked on profit.</li>
        {topN && <p className="mt-2 font-medium text-gray-700">Showing the top {topN} groups by profit.</p>}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {view.map((s, i) => {
          const totalExpenses = s.expenseToGroups + s.expenseToStore
          const profit = s.profitLoss >= 0
          return (
            <div key={s.groupId} className="bg-white rounded-xl shadow-sm p-4 border border-gray-100 break-inside-avoid">
              <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                {topN && <span className="text-xs font-bold text-white bg-orange rounded-full w-5 h-5 flex items-center justify-center shrink-0">{i + 1}</span>}
                {s.name}
              </h3>

              <dl className="text-sm">
                <Row label="Starting capital" value={s.startingCapital} muted />
                <Row label="Members" value={s.members} muted />
                <div className="my-2 border-t border-gray-100" />
                <Row label="Revenue (money in)" value={s.revenue} tone="pos" />
                {s.expenseToGroups > 0 && (
                  <Row label="Expenses — other groups" value={-s.expenseToGroups} tone="neg" indent />
                )}
                <Row label="Expenses — MAIN STORE" value={-s.expenseToStore} tone={s.expenseToStore ? 'neg' : undefined} indent />
                <Row label="Total expenses" value={-totalExpenses} tone={totalExpenses ? 'neg' : undefined} />
                <div className="my-2 border-t border-gray-100" />
                <Row label="Cash on hand" value={s.cash} bold />
                <div className="mt-2 flex items-center justify-between">
                  <dt className="font-semibold text-gray-700">Profit / Loss</dt>
                  <dd className={`font-bold tabular-nums ${profit ? 'text-green-600' : 'text-red-500'}`}>
                    {profit ? '▲' : '▼'} {Math.abs(s.profitLoss).toLocaleString()}
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-xs text-gray-500">Profit per member</dt>
                  <dd className={`text-xs font-semibold tabular-nums ${profit ? 'text-green-600' : 'text-red-500'}`}>
                    {s.profitPerMember.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                  </dd>
                </div>
              </dl>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Row({
  label,
  value,
  tone,
  muted,
  bold,
  indent,
}: {
  label: string
  value: number
  tone?: 'pos' | 'neg'
  muted?: boolean
  bold?: boolean
  indent?: boolean
}) {
  const color =
    tone === 'pos' ? 'text-teal-dark' : tone === 'neg' ? 'text-red-500' : muted ? 'text-gray-400' : 'text-gray-700'
  return (
    <div className={`flex items-center justify-between py-0.5 ${indent ? 'pl-3' : ''}`}>
      <dt className={`${muted ? 'text-gray-400' : 'text-gray-500'} ${indent ? 'text-xs' : ''}`}>{label}</dt>
      <dd className={`tabular-nums ${bold ? 'font-bold text-gray-800' : color}`}>
        {value < 0 ? `(${Math.abs(value).toLocaleString()})` : value.toLocaleString()}
      </dd>
    </div>
  )
}
