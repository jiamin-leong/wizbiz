import type { StoreLedger } from '@/lib/main-store'
import StorePayoutForm from './StorePayoutForm'

export default function MainStoreLedger({ ledger }: { ledger: StoreLedger }) {
  const payments = ledger.received
  const total = payments.reduce((n, p) => n + p.amount, 0)
  const totalSent = ledger.sent.reduce((n, p) => n + p.amount, 0)

  const byTeam = new Map<number, { team: string; competition: string; count: number; amount: number }>()
  for (const p of payments) {
    const row = byTeam.get(p.teamId) ?? { team: p.team, competition: p.competition, count: 0, amount: 0 }
    row.count += 1
    row.amount += p.amount
    byTeam.set(p.teamId, row)
  }
  const teamTotals = [...byTeam.values()].sort((a, b) => b.amount - a.amount)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap gap-4">
        <p className="text-sm text-gray-500 w-full">
          Every payment teams have made to MAIN STORE, newest first. Use it to confirm funds received.
        </p>
        <div className="bg-white rounded-xl shadow-sm px-6 py-4 shrink-0">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">Total received</p>
          <p className="text-4xl font-bold text-orange-dark tabular-nums leading-tight">{total.toLocaleString()}</p>
          <p className="text-xs text-gray-400">
            {payments.length} payment{payments.length === 1 ? '' : 's'} · {teamTotals.length} team{teamTotals.length === 1 ? '' : 's'}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm px-6 py-4 shrink-0">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">Store balance</p>
          <p className="text-4xl font-bold text-teal-dark tabular-nums leading-tight">{(ledger.opening + total - totalSent).toLocaleString()}</p>
          <p className="text-xs text-gray-400">{ledger.opening.toLocaleString()} opening + received − {totalSent.toLocaleString()} paid out</p>
        </div>
      </div>

      {ledger.teams.length > 0 && <StorePayoutForm teams={ledger.teams} />}

      {payments.length === 0 ? (
        <p className="bg-white rounded-xl shadow-sm px-6 py-10 text-center text-gray-400">No payments to MAIN STORE yet.</p>
      ) : (
        <>
          <section className="bg-white rounded-xl shadow-sm overflow-hidden">
            <h2 className="px-6 py-4 font-semibold text-gray-700 border-b border-ink/10">Paid per team</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase tracking-wider text-gray-400">
                  <tr>
                    <th className="px-6 py-2">Team</th>
                    <th className="px-6 py-2">Competition</th>
                    <th className="px-6 py-2 text-right">Payments</th>
                    <th className="px-6 py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {teamTotals.map(t => (
                    <tr key={`${t.competition}-${t.team}`} className="border-t border-ink/5">
                      <td className="px-6 py-2 font-medium text-gray-800">{t.team}</td>
                      <td className="px-6 py-2 text-gray-500">{t.competition}</td>
                      <td className="px-6 py-2 text-right tabular-nums text-gray-500">{t.count}</td>
                      <td className="px-6 py-2 text-right tabular-nums font-semibold text-gray-800">{t.amount.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="bg-white rounded-xl shadow-sm overflow-hidden">
            <h2 className="px-6 py-4 font-semibold text-gray-700 border-b border-ink/10">All payments</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase tracking-wider text-gray-400">
                  <tr>
                    <th className="px-6 py-2">When</th>
                    <th className="px-6 py-2">Team</th>
                    <th className="px-6 py-2">Competition</th>
                    <th className="px-6 py-2">Paid by</th>
                    <th className="px-6 py-2">Note</th>
                    <th className="px-6 py-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map(p => (
                    <tr key={p.id} className="border-t border-ink/5 align-top">
                      <td className="px-6 py-2 whitespace-nowrap text-gray-500">{p.when}</td>
                      <td className="px-6 py-2 font-medium text-gray-800">{p.team}</td>
                      <td className="px-6 py-2 text-gray-500">{p.competition}</td>
                      <td className="px-6 py-2 text-gray-500">{p.paidBy}</td>
                      <td className="px-6 py-2 text-gray-500">{p.message ?? '—'}</td>
                      <td className="px-6 py-2 text-right tabular-nums font-semibold text-gray-800">{p.amount.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {ledger.sent.length > 0 && (
            <section className="bg-white rounded-xl shadow-sm overflow-hidden">
              <h2 className="px-6 py-4 font-semibold text-gray-700 border-b border-ink/10">Paid out to teams</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-xs uppercase tracking-wider text-gray-400">
                    <tr>
                      <th className="px-6 py-2">When</th>
                      <th className="px-6 py-2">Team</th>
                      <th className="px-6 py-2">Competition</th>
                      <th className="px-6 py-2">Note</th>
                      <th className="px-6 py-2 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ledger.sent.map(p => (
                      <tr key={p.id} className="border-t border-ink/5 align-top">
                        <td className="px-6 py-2 whitespace-nowrap text-gray-500">{p.when}</td>
                        <td className="px-6 py-2 font-medium text-gray-800">{p.team}</td>
                        <td className="px-6 py-2 text-gray-500">{p.competition}</td>
                        <td className="px-6 py-2 text-gray-500">{p.message ?? '—'}</td>
                        <td className="px-6 py-2 text-right tabular-nums font-semibold text-teal-dark">{p.amount.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}
