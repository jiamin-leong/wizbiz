'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { confirmAdvancement, clearAdvancement } from '@/lib/programme-actions'
import { hasTieAtCut, ADVANCING_PER_CLASS, type Statement } from '@/lib/standings'

function coins(n: number) {
  return n.toLocaleString(undefined, { maximumFractionDigits: 1 })
}

export default function Standings({
  statements,
  competitionId,
  canAdvance,
}: {
  statements: Statement[]
  competitionId: number
  canAdvance: boolean
}) {
  const router = useRouter()
  const confirmed = statements.filter(s => s.qualified)
  const isConfirmed = confirmed.length > 0

  const [selected, setSelected] = useState<number[]>(
    isConfirmed
      ? [...confirmed].sort((a, b) => (a.qualifiedRank ?? 0) - (b.qualifiedRank ?? 0)).map(s => s.groupId)
      : statements.slice(0, ADVANCING_PER_CLASS).map(s => s.groupId)
  )
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const tied = hasTieAtCut(statements, ADVANCING_PER_CLASS)

  const topByProfit = statements.slice(0, ADVANCING_PER_CLASS).map(s => s.groupId)
  const overridesRanking =
    isConfirmed && confirmed.some(s => !topByProfit.includes(s.groupId))

  function toggle(groupId: number) {
    setError('')
    setSelected(prev =>
      prev.includes(groupId) ? prev.filter(id => id !== groupId) : [...prev, groupId]
    )
  }

  async function handleConfirm() {
    setError('')
    setBusy(true)
    const result = await confirmAdvancement(competitionId, selected)
    setBusy(false)
    if (result?.error) { setError(result.error); return }
    router.refresh()
  }

  async function handleReopen() {
    setBusy(true)
    const result = await clearAdvancement(competitionId)
    setBusy(false)
    if (result?.error) { setError(result.error); return }
    router.refresh()
  }

  if (statements.length === 0) {
    return <p className="text-sm text-gray-400">No teams yet.</p>
  }

  return (
    <div className="print-area">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-1">
        <h2 className="text-lg font-semibold text-gray-700">Standings</h2>
        <button
          onClick={() => window.print()}
          className="text-sm text-orange border border-ink/15 hover:bg-paper-2 px-3 py-1.5 rounded-lg transition font-medium print-hide"
        >
          Export PDF
        </button>
      </div>

      <div className="mb-4 max-w-2xl rounded-lg bg-white border border-gray-100 px-4 py-3 text-sm text-ink-soft leading-relaxed">
        <p className="mb-1">
          Ranked by <span className="font-semibold text-gray-800">profit</span>. Every team starts on
          the same capital, so profit compares like for like. Tie-break: profit → revenue → name.
        </p>
        <p className="text-xs">
          <span className="font-semibold text-orange-dark">This ranking is a guide, not the decision.</span>{' '}
          Tick any {ADVANCING_PER_CLASS} teams to advance — the top {ADVANCING_PER_CLASS} are
          pre-selected, but you can pick differently on creativity, teamwork or presentation.
        </p>
      </div>

      {tied && (
        <div className="mb-4 rounded-lg border-l-4 border-orange bg-orange/[0.06] px-4 py-3 text-sm">
          <span className="font-semibold text-orange-dark">Tie at the cut. </span>
          <span className="text-ink-soft">
            Positions {ADVANCING_PER_CLASS} and {ADVANCING_PER_CLASS + 1} cannot be separated by
            profit or revenue. Pick between them yourself before confirming.
          </span>
        </div>
      )}

      {isConfirmed && (
        <div className="mb-4 rounded-lg border-l-4 border-teal bg-teal/[0.06] px-4 py-3 text-sm">
          <span className="font-semibold text-teal-dark">Confirmed. </span>
          <span className="text-ink-soft">
            {confirmed.map(s => s.name).join(', ')} advance to the final. Later transactions will not
            change this.
            {overridesRanking && ' This differs from the profit ranking — a teacher pick.'}
          </span>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] bg-white rounded-xl border border-gray-100 text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-gray-400 border-b border-gray-100">
              {canAdvance && !isConfirmed && <th className="px-3 py-2 w-10 print-hide"></th>}
              <th className="px-3 py-2 w-10">#</th>
              <th className="px-3 py-2">Team</th>
              <th className="px-3 py-2 text-right">Profit</th>
              <th className="px-3 py-2 text-right">Revenue</th>
              <th className="px-3 py-2 text-right">Members</th>
              <th className="px-3 py-2 text-right">Profit / member</th>
            </tr>
          </thead>
          <tbody>
            {statements.map((s, i) => {
              const inCut = selected.includes(s.groupId)
              const atCutLine = i === ADVANCING_PER_CLASS - 1
              return (
                <tr
                  key={s.groupId}
                  className={`border-b border-gray-50 last:border-0 ${inCut ? 'bg-orange/[0.05]' : ''} ${atCutLine ? 'border-b-2 border-b-orange/40' : ''}`}
                >
                  {canAdvance && !isConfirmed && (
                    <td className="px-3 py-2 print-hide">
                      <input
                        type="checkbox"
                        checked={inCut}
                        onChange={() => toggle(s.groupId)}
                        className="accent-orange w-4 h-4"
                        aria-label={`Advance ${s.name}`}
                      />
                    </td>
                  )}
                  <td className="px-3 py-2 tabular-nums text-gray-400">{i + 1}</td>
                  <td className="px-3 py-2 font-semibold text-gray-800">
                    {s.name}
                    {s.qualified && <span className="ml-2 text-[11px] font-semibold text-teal-dark">✓ advancing</span>}
                  </td>
                  <td className={`px-3 py-2 text-right tabular-nums font-semibold ${s.profitLoss >= 0 ? 'text-teal-dark' : 'text-red-500'}`}>
                    {coins(s.profitLoss)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-gray-500">{coins(s.revenue)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-gray-400">{s.members}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-gray-400">{coins(s.profitPerMember)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {error && <p className="text-red-500 text-sm mt-3">{error}</p>}

      {canAdvance && (
        <div className="mt-4 flex flex-wrap items-center gap-3 print-hide">
          {isConfirmed ? (
            <button
              onClick={handleReopen}
              disabled={busy}
              className="text-sm font-medium text-gray-600 border border-ink/15 bg-white hover:border-ink/30 px-4 py-2 rounded-lg transition disabled:opacity-50"
            >
              {busy ? 'Reopening…' : 'Reopen selection'}
            </button>
          ) : (
            <>
              <button
                onClick={handleConfirm}
                disabled={busy || selected.length !== ADVANCING_PER_CLASS}
                className="btn-metal btn-orange px-4 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {busy ? 'Confirming…' : `Confirm top ${ADVANCING_PER_CLASS}`}
              </button>
              <span className="text-sm text-gray-400">
                {selected.length} of {ADVANCING_PER_CLASS} selected
                {selected.some(id => !topByProfit.includes(id)) && (
                  <span className="text-orange-dark font-medium"> · teacher pick</span>
                )}
              </span>
            </>
          )}
        </div>
      )}
    </div>
  )
}
