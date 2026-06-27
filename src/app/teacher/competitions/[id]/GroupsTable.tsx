'use client'

import { useState } from 'react'

type Student = { id: number; loginCode: string; groupId: number }
type Group = {
  id: number
  name: string
  balance: number
  groupPassword: string
  students: Student[]
}

export default function GroupsTable({
  groups,
  initialBalance,
}: {
  groups: Group[]
  initialBalance: number
}) {
  const [showAll, setShowAll] = useState(false)
  const [revealed, setRevealed] = useState<Record<number, boolean>>({})

  function isRevealed(id: number) {
    return showAll || !!revealed[id]
  }

  function toggle(id: number) {
    setRevealed(r => ({ ...r, [id]: !isRevealed(id) }))
  }

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-amber-50 border-b border-amber-100">
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-12">#</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-32">Group</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-16">Count</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-44">
              <div className="flex items-center gap-2">
                Password
                <button
                  onClick={() => {
                    setShowAll(s => !s)
                    setRevealed({})
                  }}
                  className="text-amber-500 hover:text-amber-600 font-medium normal-case tracking-normal text-xs transition"
                >
                  {showAll ? 'hide all' : 'show all'}
                </button>
              </div>
            </th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-amber-600 uppercase tracking-wide w-36">WizCoins</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Participants</th>
          </tr>
        </thead>
        <tbody>
          {groups.map((g, i) => (
            <tr key={g.id} className="border-b border-gray-50 last:border-0 hover:bg-amber-50/40 transition">
              <td className="px-4 py-3 text-gray-400 font-medium">{i + 1}</td>
              <td className="px-4 py-3 font-semibold text-gray-700">{g.name}</td>
              <td className="px-4 py-3 font-semibold text-gray-700">{g.students.length}</td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-sm bg-gray-100 text-gray-700 px-2 py-1 rounded">
                    {isRevealed(g.id) ? g.groupPassword || '—' : '••••••••'}
                  </span>
                  <button
                    onClick={() => toggle(g.id)}
                    className="text-xs text-gray-400 hover:text-amber-500 transition"
                  >
                    {isRevealed(g.id) ? 'hide' : 'show'}
                  </button>
                </div>
              </td>
              <td className="px-4 py-3">
                <span className="font-bold text-amber-600">{g.balance.toLocaleString()}</span>
                <span className="text-xs text-gray-400 ml-1">
                  {g.balance >= initialBalance
                    ? <span className="text-green-500">▲ {(g.balance - initialBalance).toLocaleString()}</span>
                    : <span className="text-red-400">▼ {(initialBalance - g.balance).toLocaleString()}</span>}
                </span>
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-1.5">
                  {g.students.map(s => (
                    <span key={s.id} className="bg-amber-100 text-amber-700 text-xs font-mono px-2.5 py-1 rounded-full">
                      {s.loginCode}
                    </span>
                  ))}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
