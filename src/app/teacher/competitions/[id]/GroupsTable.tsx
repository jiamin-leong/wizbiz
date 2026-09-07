'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { renameGroup, removeStudent, addStudent, previewAsStudent } from '@/lib/teacher-actions'

type Student = { id: number; loginCode: string; groupId: number; personalBalance: number }
type Group = {
  id: number
  name: string
  balance: number
  groupPassword: string
  kind: 'team' | 'judges' | 'spectators'
  students: Student[]
}

function exportCSV(groups: Group[]) {
  const rows = [['Group', 'Password', 'WizCoins Balance', 'Login Code', 'Personal Balance']]
  for (const g of groups) {
    for (const s of g.students) {
      rows.push([g.name, g.groupPassword, String(g.balance), s.loginCode, String(s.personalBalance)])
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
  canManage = true,
}: {
  groups: Group[]
  initialBalance: number
  canManage?: boolean
}) {
  const router = useRouter()
  // Competitors first, then spectators, then judges — all three need their
  // credentials printed, but only the first are the competition.
  const order = { team: 0, spectators: 1, judges: 2 }
  const sortedGroups = [...groups].sort((a, b) =>
    order[a.kind] - order[b.kind] || a.name.localeCompare(b.name))
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

  function groupDelta(balance: number) {
    return balance >= initialBalance
      ? <span className="text-green-500">▲ {(balance - initialBalance).toLocaleString()}</span>
      : <span className="text-red-400">▼ {(initialBalance - balance).toLocaleString()}</span>
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-lg font-semibold text-gray-700">Student Login Credentials</h2>
        <div className="flex gap-2">
          <button
            onClick={() => exportCSV(sortedGroups)}
            className="text-sm text-orange border border-ink/15 hover:bg-paper-2 px-3 py-1.5 rounded-lg transition font-medium"
          >
            Export CSV
          </button>
          <button
            onClick={() => { setShowAll(s => !s); setRevealed({}) }}
            className="text-sm text-gray-600 border border-gray-300 hover:bg-gray-50 px-3 py-1.5 rounded-lg transition font-medium"
          >
            {showAll ? 'Hide passwords' : 'Show passwords'}
          </button>
          {canManage && (
            <button
              onClick={() => { setEditing(e => !e); setEditingNameId(null) }}
              className={`text-sm px-3 py-1.5 rounded-lg transition font-medium border ${
                editing
                  ? 'bg-orange text-white border-orange hover:bg-orange-dark'
                  : 'text-gray-600 border-gray-300 hover:bg-gray-50'
              }`}
            >
              {editing ? 'Done editing' : '✏ Edit groups'}
            </button>
          )}
        </div>
      </div>

      {editing && (
        <p className="text-xs text-orange bg-paper-2 border border-ink/15 rounded-lg px-3 py-2 mb-3">
          Click a group name to rename it. Use × to remove a participant. Use + Add to add one to a group.
        </p>
      )}

      {/* Desktop: participants grouped; shared group info spans its rows */}
      <div className="hidden md:block bg-white rounded-xl shadow-sm overflow-x-auto">
        <table className="w-full min-w-[880px] text-sm">
          <thead>
            <tr className="bg-paper-2 border-b border-ink/10">
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-10">#</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-48">Group</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-44">Password</th>
              <th className="text-left px-4 py-3 w-44">
                <span className="block text-xs font-semibold text-orange uppercase tracking-wide">Group WizCoins</span>
                <span className="block text-[10px] font-normal normal-case tracking-normal text-gray-400 mt-0.5">Shared · business income &amp; expenses</span>
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-40">Login Code</th>
              <th className="text-left px-4 py-3 w-40">
                <span className="block text-xs font-semibold text-teal uppercase tracking-wide">Personal WizCoins</span>
                <span className="block text-[10px] font-normal normal-case tracking-normal text-gray-400 mt-0.5">Private · per participant</span>
              </th>
              {editing && <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-12"></th>}
            </tr>
          </thead>
          <tbody>
            {sortedGroups.map((g, gi) => {
              const studs = [...g.students].sort((a, b) => a.loginCode.localeCompare(b.loginCode))
              const span = Math.max(studs.length, 1)
              const zebra = gi % 2 === 1 ? 'bg-paper-2/20' : 'bg-white'
              const gCell = `px-4 py-3 align-top border-t-2 border-ink/10 ${zebra}`
              const groupCells = (
                <>
                  <td rowSpan={span} className={`${gCell} text-gray-400 font-medium`}>{gi + 1}</td>
                  <td rowSpan={span} className={gCell}>
                    {editing && editingNameId === g.id ? (
                      <input
                        autoFocus
                        value={editingName}
                        onChange={e => setEditingName(e.target.value)}
                        onBlur={() => handleRename(g.id)}
                        onKeyDown={e => { if (e.key === 'Enter') handleRename(g.id); if (e.key === 'Escape') setEditingNameId(null) }}
                        className="border border-orange rounded px-2 py-0.5 text-sm w-32 focus:outline-none focus:ring-1 focus:ring-teal"
                      />
                    ) : (
                      <div className="flex flex-col gap-1">
                        <span
                          onClick={() => editing && (setEditingNameId(g.id), setEditingName(g.name))}
                          className={`font-semibold text-gray-700 ${editing ? 'cursor-pointer underline decoration-dashed decoration-orange underline-offset-2 hover:text-orange transition w-fit' : ''}`}
                        >
                          {g.name}
                        </span>
                        <span className="text-[11px] text-gray-400">{studs.length} {studs.length === 1 ? 'participant' : 'participants'}</span>
                        {!editing && (
                          <button
                            onClick={async () => { setPreviewing(g.id); await previewAsStudent(g.id) }}
                            disabled={previewing === g.id}
                            className="text-xs text-orange hover:text-orange-dark transition disabled:opacity-50 w-fit"
                          >
                            {previewing === g.id ? 'Loading…' : '🔍 Preview'}
                          </button>
                        )}
                        {editing && (
                          <button
                            onClick={() => handleAdd(g.id)}
                            disabled={!!adding[g.id]}
                            className="text-xs text-orange bg-paper-2 border border-ink/15 px-2 py-0.5 rounded-full transition font-medium disabled:opacity-50 w-fit"
                          >
                            {adding[g.id] ? '...' : '+ Add'}
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                  <td rowSpan={span} className={gCell}>
                    <div className="flex items-center gap-1.5">
                      <span className="font-pixel text-sm bg-gray-100 text-gray-700 px-2 py-1 rounded">
                        {isRevealed(g.id) ? g.groupPassword || '—' : '••••••••'}
                      </span>
                      <button
                        onClick={() => toggleReveal(g.id)}
                        className="text-xs text-gray-400 hover:text-orange transition"
                      >
                        {isRevealed(g.id) ? 'hide' : 'show'}
                      </button>
                    </div>
                  </td>
                  <td rowSpan={span} className={gCell}>
                    <span className="font-bold text-orange tabular-nums">{g.balance.toLocaleString()}</span>
                    <span className="ml-1 text-xs">{groupDelta(g.balance)}</span>
                    <p className="text-[10px] text-gray-400 mt-0.5">shared by group</p>
                  </td>
                </>
              )

              if (studs.length === 0) {
                return (
                  <tr key={`g-${g.id}`}>
                    {groupCells}
                    <td className={`px-4 py-3 border-t-2 border-ink/10 text-gray-300 text-xs ${zebra}`} colSpan={editing ? 3 : 2}>
                      No participants
                    </td>
                  </tr>
                )
              }

              return studs.map((s, si) => {
                const pCell = `px-4 py-2.5 ${si === 0 ? 'border-t-2 border-ink/10' : 'border-t border-gray-100'} ${zebra}`
                return (
                  <tr key={`s-${s.id}`}>
                    {si === 0 && groupCells}
                    <td className={pCell}>
                      <span className="font-pixel text-xs bg-paper-2 text-orange-dark px-2.5 py-1 rounded-full whitespace-nowrap">{s.loginCode}</span>
                    </td>
                    <td className={`${pCell} font-semibold text-teal tabular-nums`}>{s.personalBalance.toLocaleString()}</td>
                    {editing && (
                      <td className={pCell}>
                        <button
                          onClick={() => handleRemove(s.id)}
                          className="text-orange hover:text-red-500 transition leading-none font-bold text-lg"
                          title="Remove participant"
                        >
                          ×
                        </button>
                      </td>
                    )}
                  </tr>
                )
              })
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile: one card per group, participants as their own rows */}
      <div className="md:hidden flex flex-col gap-3">
        {sortedGroups.map(g => (
          <div key={g.id} className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                {editing && editingNameId === g.id ? (
                  <input
                    autoFocus
                    value={editingName}
                    onChange={e => setEditingName(e.target.value)}
                    onBlur={() => handleRename(g.id)}
                    onKeyDown={e => { if (e.key === 'Enter') handleRename(g.id); if (e.key === 'Escape') setEditingNameId(null) }}
                    className="border border-orange rounded px-2 py-0.5 text-base w-full max-w-[12rem] focus:outline-none focus:ring-1 focus:ring-teal"
                  />
                ) : (
                  <span
                    onClick={() => editing && (setEditingNameId(g.id), setEditingName(g.name))}
                    className={`font-semibold text-gray-800 text-base block truncate ${editing ? 'cursor-pointer underline decoration-dashed decoration-orange underline-offset-2' : ''}`}
                  >
                    {g.name}
                  </span>
                )}
                <div className="text-sm mt-0.5">
                  <span className="font-bold text-orange tabular-nums">{g.balance.toLocaleString()}</span>
                  <span className="text-gray-400"> WizCoins</span>
                  <span className="ml-1 text-xs">{groupDelta(g.balance)}</span>
                </div>
              </div>
              {!editing && (
                <button
                  onClick={async () => { setPreviewing(g.id); await previewAsStudent(g.id) }}
                  disabled={previewing === g.id}
                  className="shrink-0 text-xs text-orange hover:text-orange-dark transition disabled:opacity-50"
                >
                  {previewing === g.id ? 'Loading…' : '🔍 Preview'}
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5 mt-2">
              <span className="font-pixel text-sm bg-gray-100 text-gray-700 px-2 py-1 rounded">
                {isRevealed(g.id) ? g.groupPassword || '—' : '••••••••'}
              </span>
              <button
                onClick={() => toggleReveal(g.id)}
                className="text-xs text-gray-400 hover:text-orange transition"
              >
                {isRevealed(g.id) ? 'hide' : 'show'}
              </button>
            </div>

            <div className="mt-3 divide-y divide-gray-50 border-t border-gray-50">
              {[...g.students].sort((a, b) => a.loginCode.localeCompare(b.loginCode)).map(s => (
                <div key={s.id} className="flex items-center justify-between gap-2 py-2">
                  <span className="font-pixel text-xs bg-paper-2 text-orange-dark px-2.5 py-1 rounded-full whitespace-nowrap">{s.loginCode}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-sm">
                      <span className="font-semibold text-teal tabular-nums">{s.personalBalance.toLocaleString()}</span>
                      <span className="text-gray-400 text-xs"> personal</span>
                    </span>
                    {editing && (
                      <button
                        onClick={() => handleRemove(s.id)}
                        className="text-orange hover:text-red-500 transition leading-none font-bold text-lg"
                        title="Remove participant"
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {editing && (
                <div className="py-2">
                  <button
                    onClick={() => handleAdd(g.id)}
                    disabled={!!adding[g.id]}
                    className="text-xs text-orange bg-paper-2 border border-ink/15 px-2.5 py-1 rounded-full transition font-medium disabled:opacity-50"
                  >
                    {adding[g.id] ? '...' : '+ Add participant'}
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
