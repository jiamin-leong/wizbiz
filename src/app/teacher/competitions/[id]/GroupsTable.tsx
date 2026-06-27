'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { renameGroup, removeStudent, addStudent, previewAsStudent } from '@/lib/teacher-actions'

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
  const [editing, setEditing] = useState(false)
  const [showAll, setShowAll] = useState(false)
  const [revealed, setRevealed] = useState<Record<number, boolean>>({})
  const [editingNameId, setEditingNameId] = useState<number | null>(null)
  const [editingName, setEditingName] = useState('')
  const [adding, setAdding] = useState<Record<number, boolean>>({})
  const [previewing, setPreviewing] = useState<number | null>(null)

  function isRevealed(id: number) {
    return showAll || !!revealed[id]
  }

  function toggleReveal(id: number) {
    setRevealed(r => ({ ...r, [id]: !isRevealed(id) }))
  }

  async function handleRename(groupId: number) {
    if (!editingName.trim()) { setEditingNameId(null); return }
    await renameGroup(groupId, editingName.trim())
    setEditingNameId(null)
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
        <div className="flex gap-2">
          <button
            onClick={() => exportCSV(groups)}
            className="text-sm text-amber-600 border border-amber-300 hover:bg-amber-50 px-3 py-1.5 rounded-lg transition font-medium"
          >
            Export CSV
          </button>
          <button
            onClick={() => { setEditing(e => !e); setEditingNameId(null) }}
            className={`text-sm px-3 py-1.5 rounded-lg transition font-medium border ${
              editing
                ? 'bg-amber-500 text-white border-amber-500 hover:bg-amber-600'
                : 'text-gray-600 border-gray-300 hover:bg-gray-50'
            }`}
          >
            {editing ? 'Done editing' : '✏ Edit groups'}
          </button>
        </div>
      </div>

      {editing && (
        <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3">
          Click a group name to rename it. Use × to remove a participant. Use + Add to add one.
        </p>
      )}

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-amber-50 border-b border-amber-100">
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-10">#</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-36">Group</th>
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
              <tr key={g.id} className={`border-b border-gray-50 last:border-0 align-top transition ${editing ? 'bg-amber-50/20' : 'hover:bg-amber-50/30'}`}>
                <td className="px-4 py-3 text-gray-400 font-medium">{i + 1}</td>
                <td className="px-4 py-3">
                  {editing && editingNameId === g.id ? (
                    <input
                      autoFocus
                      value={editingName}
                      onChange={e => setEditingName(e.target.value)}
                      onBlur={() => handleRename(g.id)}
                      onKeyDown={e => { if (e.key === 'Enter') handleRename(g.id); if (e.key === 'Escape') setEditingNameId(null) }}
                      className="border border-amber-400 rounded px-2 py-0.5 text-sm w-28 focus:outline-none focus:ring-1 focus:ring-amber-400"
                    />
                  ) : (
                    <div>
                      <span
                        onClick={() => editing && (setEditingNameId(g.id), setEditingName(g.name))}
                        className={`font-semibold text-gray-700 block ${editing ? 'cursor-pointer underline decoration-dashed decoration-amber-400 underline-offset-2 hover:text-amber-600 transition' : ''}`}
                      >
                        {g.name}
                      </span>
                      {!editing && (
                        <button
                          onClick={async () => {
                            setPreviewing(g.id)
                            await previewAsStudent(g.id)
                          }}
                          disabled={previewing === g.id}
                          className="text-xs text-amber-500 hover:text-amber-700 transition mt-0.5 disabled:opacity-50"
                        >
                          {previewing === g.id ? 'Loading…' : '🔍 Preview'}
                        </button>
                      )}
                    </div>
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
                      <span key={s.id} className="flex items-center gap-1 bg-amber-100 text-amber-700 text-xs font-mono px-2.5 py-1 rounded-full">
                        {s.loginCode}
                        {editing && (
                          <button
                            onClick={() => handleRemove(s.id)}
                            className="text-amber-400 hover:text-red-500 transition leading-none font-bold"
                            title="Remove participant"
                          >
                            ×
                          </button>
                        )}
                      </span>
                    ))}
                    {editing && (
                      <button
                        onClick={() => handleAdd(g.id)}
                        disabled={!!adding[g.id]}
                        className="text-xs text-amber-600 bg-amber-50 hover:bg-amber-100 border border-amber-300 px-2.5 py-1 rounded-full transition font-medium disabled:opacity-50"
                      >
                        {adding[g.id] ? '...' : '+ Add'}
                      </button>
                    )}
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
