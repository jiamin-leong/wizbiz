'use client'

import { Fragment, useState } from 'react'
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

type Kind = Group['kind']

// One place defining how each role reads, so the table, the cards, the filter
// chips and the CSV can never drift apart.
const KIND = {
  team: {
    label: 'Competing',
    plural: 'Competing teams',
    member: 'student',
    icon: '🏆',
    blurb: 'Sell, buy and are ranked. These are the businesses in the final.',
    rail: 'bg-orange',
    chipOn: 'bg-orange text-white border-orange',
    chipOff: 'text-orange-dark border-orange/40 hover:border-orange',
    band: 'bg-orange/[0.07] text-orange-dark border-orange/30',
    badge: 'bg-orange text-white',
    tint: 'bg-orange/[0.03]',
  },
  spectators: {
    label: 'Spectators',
    plural: 'Spectator teams',
    member: 'student',
    icon: '👥',
    blurb: 'Knocked out in round 1. Buy from the finalists — cannot sell, be paid, or rank.',
    rail: 'bg-teal',
    chipOn: 'bg-teal text-white border-teal',
    chipOff: 'text-teal-dark border-teal/40 hover:border-teal',
    band: 'bg-teal/[0.07] text-teal-dark border-teal/30',
    badge: 'bg-teal text-white',
    tint: 'bg-teal/[0.03]',
  },
  judges: {
    label: 'Judges',
    plural: 'Judging panel',
    member: 'participant',
    icon: '⚖️',
    blurb: 'Spend a large personal wallet with the finalists. Cannot sell, be paid, or rank.',
    rail: 'bg-ink',
    chipOn: 'bg-ink text-white border-ink',
    chipOff: 'text-ink border-ink/30 hover:border-ink',
    band: 'bg-ink/[0.06] text-ink border-ink/25',
    badge: 'bg-ink text-white',
    tint: 'bg-ink/[0.02]',
  },
} as const satisfies Record<Kind, Record<string, string>>

const plural = (word: string, n: number) => `${word}${n === 1 ? '' : 's'}`

const KIND_ORDER: Kind[] = ['team', 'spectators', 'judges']

function exportCSV(groups: Group[]) {
  const rows = [['Role', 'Team', 'Password', 'Team Balance', 'Login Code', 'Personal Balance']]
  for (const g of groups) {
    for (const s of g.students) {
      rows.push([KIND[g.kind].label, g.name, g.groupPassword, String(g.balance), s.loginCode, String(s.personalBalance)])
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
  const [only, setOnly] = useState<Kind | null>(null)

  // Which roles are actually present — a plain class hackathon has teams only,
  // and should look exactly as it did before.
  const presentKinds = KIND_ORDER.filter(k => groups.some(g => g.kind === k))
  const mixed = presentKinds.length > 1

  const countsFor = (k: Kind) => {
    const gs = groups.filter(g => g.kind === k)
    return { groups: gs.length, students: gs.reduce((n, g) => n + g.students.length, 0) }
  }

  const visibleGroups = only ? sortedGroups.filter(g => g.kind === only) : sortedGroups

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
        <h2 className="text-lg font-semibold text-gray-700">
          Student Login Credentials
          {only && <span className="ml-2 text-sm font-normal text-gray-400">{KIND[only].plural} only</span>}
        </h2>
        <div className="flex gap-2">
          <button
            onClick={() => exportCSV(visibleGroups)}
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
              {editing ? 'Done editing' : '✏ Edit teams'}
            </button>
          )}
        </div>
      </div>

      {mixed && (
        <>
          <div className="grid gap-3 sm:grid-cols-3 mb-4">
            {presentKinds.map(k => {
              const c = countsFor(k)
              const on = only === k
              return (
                <button
                  key={k}
                  onClick={() => setOnly(on ? null : k)}
                  aria-pressed={on}
                  className={`text-left bg-white rounded-xl border-2 p-4 transition relative overflow-hidden ${
                    on ? 'border-ink shadow-sm' : 'border-gray-100 hover:border-ink/20'
                  }`}
                >
                  <span className={`absolute left-0 top-0 bottom-0 w-1.5 ${KIND[k].rail}`} />
                  <div className="pl-2">
                    <p className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
                      <span>{KIND[k].icon}</span>{KIND[k].plural}
                    </p>
                    <p className="mt-1">
                      <span className="font-display text-3xl font-bold text-gray-900 tabular-nums">{c.students}</span>
                      <span className="text-sm text-gray-400"> {plural(KIND[k].member, c.students)}</span>
                      <span className="text-sm text-gray-300"> · </span>
                      <span className="text-sm text-gray-500 tabular-nums">{c.groups} {plural('team', c.groups)}</span>
                    </p>
                    <p className="text-[11px] text-gray-400 mt-1.5 leading-snug">{KIND[k].blurb}</p>
                  </div>
                </button>
              )
            })}
          </div>

          <div className="flex items-center gap-2 flex-wrap mb-3">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Show</span>
            <button
              onClick={() => setOnly(null)}
              className={`px-3 py-1 text-xs font-semibold rounded-full border transition ${
                only === null ? 'bg-ink text-white border-ink' : 'text-gray-600 border-gray-300 hover:border-ink/40'
              }`}
            >
              Everyone
            </button>
            {presentKinds.map(k => (
              <button
                key={k}
                onClick={() => setOnly(k)}
                className={`px-3 py-1 text-xs font-semibold rounded-full border transition ${
                  only === k ? KIND[k].chipOn : `bg-white ${KIND[k].chipOff}`
                }`}
              >
                {KIND[k].icon} {KIND[k].label}
              </button>
            ))}
          </div>
        </>
      )}

      {editing && (
        <p className="text-xs text-orange bg-paper-2 border border-ink/15 rounded-lg px-3 py-2 mb-3">
          Click a team name to rename it. Use × to remove someone. Use + Add to add someone to a team.
        </p>
      )}

      {/* Desktop: participants grouped; shared group info spans its rows */}
      <div className="hidden md:block bg-white rounded-xl shadow-sm overflow-x-auto">
        <table className="w-full min-w-[880px] text-sm">
          <thead>
            <tr className="bg-paper-2 border-b border-ink/10">
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-10">#</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-48">Team</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-44">Password</th>
              <th className="text-left px-4 py-3 w-44">
                <span className="block text-xs font-semibold text-orange uppercase tracking-wide">Team WizCoins</span>
                <span className="block text-[10px] font-normal normal-case tracking-normal text-gray-400 mt-0.5">Shared · business income &amp; expenses</span>
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-40">Login Code</th>
              <th className="text-left px-4 py-3 w-40">
                <span className="block text-xs font-semibold text-teal uppercase tracking-wide">Personal WizCoins</span>
                <span className="block text-[10px] font-normal normal-case tracking-normal text-gray-400 mt-0.5">Private · per person</span>
              </th>
              {editing && <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-12"></th>}
            </tr>
          </thead>
          <tbody>
            {visibleGroups.map((g, gi) => {
              const studs = [...g.students].sort((a, b) => a.loginCode.localeCompare(b.loginCode))
              const span = Math.max(studs.length, 1)
              const k = KIND[g.kind]
              // Restart numbering per role and band the boundary, so the three
              // populations read as three blocks rather than one long list.
              const startsSection = mixed && (gi === 0 || visibleGroups[gi - 1].kind !== g.kind)
              const indexInKind = visibleGroups.slice(0, gi).filter(x => x.kind === g.kind).length + 1
              const zebra = mixed ? k.tint : (gi % 2 === 1 ? 'bg-paper-2/20' : 'bg-white')
              const gCell = `px-4 py-3 align-top border-t-2 border-ink/10 ${zebra}`
              const groupCells = (
                <>
                  <td rowSpan={span} className={`${gCell} text-gray-400 font-medium relative`}>
                    {mixed && <span className={`absolute left-0 top-0 bottom-0 w-1.5 ${k.rail}`} />}
                    <span className="pl-1.5 block">{mixed ? indexInKind : gi + 1}</span>
                  </td>
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
                        {mixed && (
                          <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full w-fit ${k.badge}`}>
                            {k.label}
                          </span>
                        )}
                        <span className="text-[11px] text-gray-400">{studs.length} {plural(k.member, studs.length)}</span>
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
                    {g.kind === 'team' ? (
                      <>
                        <span className="font-bold text-orange tabular-nums">{g.balance.toLocaleString()}</span>
                        <span className="ml-1 text-xs">{groupDelta(g.balance)}</span>
                        <p className="text-[10px] text-gray-400 mt-0.5">shared by team</p>
                      </>
                    ) : (
                      <>
                        <span className="text-gray-300">—</span>
                        <p className="text-[10px] text-gray-400 mt-0.5">no business wallet</p>
                      </>
                    )}
                  </td>
                </>
              )

              const band = startsSection ? (
                <tr key={`band-${g.kind}`}>
                  <td colSpan={editing ? 7 : 6} className={`px-4 py-2 border-t-2 border-b ${k.band}`}>
                    <span className="text-xs font-bold uppercase tracking-wide">
                      {k.icon} {k.plural}
                      <span className="font-normal normal-case tracking-normal opacity-70">
                        {' '}· {countsFor(g.kind).groups} {plural('team', countsFor(g.kind).groups)},{' '}
                        {countsFor(g.kind).students} {plural(k.member, countsFor(g.kind).students)} — {k.blurb}
                      </span>
                    </span>
                  </td>
                </tr>
              ) : null

              if (studs.length === 0) {
                return (
                  <Fragment key={`g-${g.id}`}>
                  {band}
                  <tr>
                    {groupCells}
                    <td className={`px-4 py-3 border-t-2 border-ink/10 text-gray-300 text-xs ${zebra}`} colSpan={editing ? 3 : 2}>
                      No members
                    </td>
                  </tr>
                  </Fragment>
                )
              }

              return (
                <Fragment key={`g-${g.id}`}>
                {band}
                {studs.map((s, si) => {
                const pCell = `px-4 py-2.5 ${si === 0 ? 'border-t-2 border-ink/10' : 'border-t border-gray-100'} ${zebra}`
                return (
                  <tr key={s.id}>
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
                          title="Remove from team"
                        >
                          ×
                        </button>
                      </td>
                    )}
                  </tr>
                )
                })}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile: one card per group, participants as their own rows */}
      <div className="md:hidden flex flex-col gap-3">
        {visibleGroups.map((g, gi) => (
          <Fragment key={g.id}>
          {mixed && (gi === 0 || visibleGroups[gi - 1].kind !== g.kind) && (
            <div className={`rounded-lg border px-3 py-2 ${KIND[g.kind].band}`}>
              <p className="text-xs font-bold uppercase tracking-wide">
                {KIND[g.kind].icon} {KIND[g.kind].plural}
                <span className="font-normal normal-case tracking-normal opacity-70">
                  {' '}· {countsFor(g.kind).groups} {plural('team', countsFor(g.kind).groups)},{' '}
                  {countsFor(g.kind).students} {plural(KIND[g.kind].member, countsFor(g.kind).students)}
                </span>
              </p>
              <p className="text-[11px] mt-0.5 opacity-80 normal-case font-normal">{KIND[g.kind].blurb}</p>
            </div>
          )}
          <div className="bg-white rounded-xl shadow-sm p-4 relative overflow-hidden">
            {mixed && <span className={`absolute left-0 top-0 bottom-0 w-1.5 ${KIND[g.kind].rail}`} />}
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                {mixed && (
                  <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full inline-block mb-1 ${KIND[g.kind].badge}`}>
                    {KIND[g.kind].label}
                  </span>
                )}
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
                  {g.kind === 'team' ? (
                    <>
                      <span className="font-bold text-orange tabular-nums">{g.balance.toLocaleString()}</span>
                      <span className="text-gray-400"> WizCoins</span>
                      <span className="ml-1 text-xs">{groupDelta(g.balance)}</span>
                    </>
                  ) : (
                    <span className="text-xs text-gray-400">No business wallet · personal only</span>
                  )}
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
                        title="Remove from team"
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
                    {adding[g.id] ? '...' : '+ Add member'}
                  </button>
                </div>
              )}
            </div>
          </div>
          </Fragment>
        ))}
      </div>
    </div>
  )
}
