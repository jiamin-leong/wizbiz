'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { renameGroup, removeStudent, addStudent } from '@/lib/teacher-actions'

type Student = { id: number; loginCode: string; groupId: number }
type Group = {
  id: number
  name: string
  balance: number
  groupPassword: string
  students: Student[]
}

function exportCSV(groups: Group[]) {
  const rows = [['Group', 'Password', 'Login Code']]
  for (const g of groups) {
    for (const s of g.students) {
      rows.push([g.name, g.groupPassword, s.loginCode])
    }
  }
  const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'wizbiz-credentials.csv'
  a.click()
  URL.revokeObjectURL(url)
}

export default function GroupsTable({
  groups,
  initialBalance,
}: {
  groups: Group[]
  initialBalance: number
}) {
  const router = useRouter()
  const [showAll, setShowAll] = useState(false)
  const [revealed, setRevealed] = useState<Record<number, boolean>>({})
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editingName, setEditingName] = useState('')
  const [adding, setAdding] = useState<Record<number, boolean>>({})

  function isRevealed(id: number) {
    return showAll || !!revealed[id]
  }

  function toggleReveal(id: number) {
    setRevealed(r => ({ ...r, [id]: !isRevealed(id) }))
  }

  async function handleRename(groupId: number) {
    if (!editingName.trim()) { setEditingId(null); return }
    await renameGroup(groupId, editingName.trim())
    setEditingId(null)
    router.refresh()
  }

  async function handleRemove(studentId: number) {
    const result = await removeStudent(studentId)
    if (result?.error) alert(result.error)
    else router.refresh()
  }

  async function handleAdd(groupId: number) {
    setAdding(a => ({ ...a, [groupId]: true }))
    const result = await addStudent(groupId)
    setAdding(a => ({ ...a, [groupId]: false }))
    if (result?.error) alert(result.error)
    else router.refresh()
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-lg font-semibold text-gray-700">Student Login Credentials</h2>
        <button
          onClick={() => exportCSV(groups)}
          className="text-sm text-amber-600 border border-amber-300 hover:bg-amber-50 px-3 py-1.5 rounded-lg transition font-medium"
        >
          Export CSV
        </button>
      </div>
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-amber-50 border-b border-amber-100">
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-10">#</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-32">Group</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-14">Count</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-44">
                <div className="flex items-center gap-2">
                  Password
                  <button
                    onClick={() => { setShowAll(s => !s); setRevealed({}) }}
                    className="text-amber-500 hover:text-amber-600 font-medium normal-case tracking-normal text-xs transition"
                  >
                    {showAll ? 'hide all' : 'show all'}
                  </button>
                </div>
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-amber-600 uppercase tracking-wide w-32">WizCoins</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Participants</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((g, i) => (
              <tr key={g.id} className="border-b border-gray-50 last:border-0 hover:bg-amber-50/30 transition align-top">
                <td className="px-4 py-3 text-gray-400 font-medium">{i + 1}</td>
                <td className="px-4 py-3 font-semibold text-gray-700">
                  {editingId === g.id ? (
                    <input
                      autoFocus
                      value={editingName}
                      onChange={e => setEditingName(e.target.value)}
                      onBlur={() => handleRename(g.id)}
                      onKeyDown={e => { if (e.key === 'Enter') handleRename(g.id); if (e.key === 'Escape') setEditingId(null) }}
                      className="border border-amber-300 rounded px-2 py-0.5 text-sm w-28 focus:outline-none focus:ring-1 focus:ring-amber-400"
                    />
                  ) : (
                    <span
                      onClick={() => { setEditingId(g.id); setEditingName(g.name) }}
                      className="cursor-pointer hover:text-amber-600 transition"
                      title="Click to rename"
                    >
                      {g.name}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 font-semibold text-gray-700">{g.students.length}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-sm bg-gray-100 text-gray-700 px-2 py-1 rounded">
                      {isRevealed(g.id) ? g.groupPassword || '—' : '••••••••'}
                    </span>
                    <button
                      onClick={() => toggleReveal(g.id)}
                      className="text-xs text-gray-400 hover:text-amber-500 transition"
                    >
                      {isRevealed(g.id) ? 'hide' : 'show'}
                    </button>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="font-bold text-amber-600">{g.balance.toLocaleString()}</span>
                  <span className="ml-1 text-xs">
                    {g.balance >= initialBalance
                      ? <span className="text-green-500">▲ {(g.balance - initialBalance).toLocaleString()}</span>
                      : <span className="text-red-400">▼ {(initialBalance - g.balance).toLocaleString()}</span>}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1.5 items-center">
                    {g.students.map(s => (
                      <span key={s.id} className="group/pill flex items-center gap-1 bg-amber-100 text-amber-700 text-xs font-mono px-2.5 py-1 rounded-full">
                        {s.loginCode}
                        <button
                          onClick={() => handleRemove(s.id)}
                          className="opacity-0 group-hover/pill:opacity-100 text-amber-400 hover:text-red-500 transition leading-none"
                          title="Remove participant"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                    <button
                      onClick={() => handleAdd(g.id)}
                      disabled={!!adding[g.id]}
                      className="text-xs text-amber-500 hover:text-amber-700 border border-dashed border-amber-300 hover:border-amber-500 px-2 py-1 rounded-full transition disabled:opacity-50"
                    >
                      {adding[g.id] ? '...' : '+ Add'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
