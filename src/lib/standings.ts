// Business statements and the ranking that guides who advances to round 2.
//
// Every team starts on the same flat business capital, so raw profit is
// directly comparable and is what teams are ranked on. Profit per member is
// still shown, but it is not the ranking.
//
// The ranking is advisory: the class teacher chooses the teams that actually
// advance, so creativity, teamwork and presentation can override the ledger.

export type Statement = {
  groupId: number
  teamId: number | null
  name: string
  members: number
  startingCapital: number
  revenue: number
  expenseToGroups: number
  expenseToStore: number
  cash: number
  profitLoss: number
  profitPerMember: number
  qualified: boolean
  qualifiedRank: number | null
}

export type StatementInputs = {
  groups: {
    id: number
    name: string
    balance: number
    teamId: number | null
    startingCapital: number | null
    qualified: boolean
    qualifiedRank: number | null
  }[]
  students: { groupId: number }[]
  transfers: {
    fromGroupId: number
    toGroupId: number | null
    toStore: boolean
    fromPersonal: boolean
    amount: number
  }[]
  /** Used when a group predates per-group starting capital. */
  fallbackStartingCapital: number
}

export function computeStatements({
  groups,
  students,
  transfers,
  fallbackStartingCapital,
}: StatementInputs): Statement[] {
  return groups.map(g => {
    // Revenue = all money received. Business expenses = business-wallet outflows
    // only (to MAIN STORE, or business-to-business); personal consumer spending
    // is excluded.
    const revenue = transfers.filter(t => t.toGroupId === g.id).reduce((s, t) => s + t.amount, 0)
    const expenseToGroups = transfers
      .filter(t => t.fromGroupId === g.id && !t.toStore && !t.fromPersonal)
      .reduce((s, t) => s + t.amount, 0)
    const expenseToStore = transfers
      .filter(t => t.fromGroupId === g.id && t.toStore)
      .reduce((s, t) => s + t.amount, 0)

    const members = students.filter(s => s.groupId === g.id).length
    const startingCapital = g.startingCapital ?? fallbackStartingCapital
    const profitLoss = g.balance - startingCapital

    return {
      groupId: g.id,
      teamId: g.teamId,
      name: g.name,
      members,
      startingCapital,
      revenue,
      expenseToGroups,
      expenseToStore,
      cash: g.balance,
      profitLoss,
      profitPerMember: members > 0 ? profitLoss / members : profitLoss,
      qualified: g.qualified,
      qualifiedRank: g.qualifiedRank,
    }
  })
}

/**
 * Published order, in order of precedence: profit, then total revenue, then
 * team name so the order is at least stable. Capital is flat across teams, so
 * profit is a like-for-like comparison.
 */
export function compareForAdvancement(a: Statement, b: Statement): number {
  if (b.profitLoss !== a.profitLoss) return b.profitLoss - a.profitLoss
  if (b.revenue !== a.revenue) return b.revenue - a.revenue
  return a.name.localeCompare(b.name)
}

export function rankStatements(statements: Statement[]): Statement[] {
  return [...statements].sort(compareForAdvancement)
}

/** True when the teams at positions `cut - 1` and `cut` cannot be separated. */
export function hasTieAtCut(ranked: Statement[], cut: number): boolean {
  if (ranked.length <= cut) return false
  const last = ranked[cut - 1]
  const next = ranked[cut]
  return last.profitLoss === next.profitLoss && last.revenue === next.revenue
}

export const ADVANCING_PER_CLASS = 3
