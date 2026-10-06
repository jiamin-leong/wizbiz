// Group allocation for a class: teams of 5, never a loose team of 1-2.
// The number of teams is the headcount over 5 rounded to the nearest whole, and
// students are then spread evenly, so every team is 5 give or take one: 39
// students make seven teams of 5 and one of 4, 41 make seven of 5 and one of 6.
// Classes too big for that (more than 8 teams) fall back to larger teams, as
// each class only owns 8 team themes.

export const TARGET_GROUP_SIZE = 5
export const MIN_GROUP_SIZE = 4
export const MAX_GROUP_SIZE = 8
export const MAX_GROUPS_PER_CLASS = 8

export const MAX_CLASS_HEADCOUNT = MAX_GROUPS_PER_CLASS * MAX_GROUP_SIZE // 64

export function groupCountFor(headcount: number): number {
  const nearest = Math.round(headcount / TARGET_GROUP_SIZE)
  // Never let a group exceed MAX_GROUP_SIZE, even if that beats the target.
  const minimumNeeded = Math.ceil(headcount / MAX_GROUP_SIZE)
  return Math.max(1, Math.min(Math.max(nearest, minimumNeeded), MAX_GROUPS_PER_CLASS))
}

/** Sizes of each group, largest first, summing to headcount. */
export function allocateGroups(headcount: number): number[] {
  const count = groupCountFor(headcount)
  const base = Math.floor(headcount / count)
  const remainder = headcount % count
  return Array.from({ length: count }, (_, i) => base + (i < remainder ? 1 : 0))
}

export function allocationError(headcount: number): string | null {
  if (!Number.isInteger(headcount) || headcount < 1) {
    return 'Headcount must be a whole number of at least 1.'
  }
  if (headcount > MAX_CLASS_HEADCOUNT) {
    return `A class cannot exceed ${MAX_CLASS_HEADCOUNT} students (${MAX_GROUPS_PER_CLASS} groups of ${MAX_GROUP_SIZE}).`
  }
  return null
}

/** Human-readable summary, e.g. "7 groups · 6,6,6,6,6,6,5". */
export function allocationSummary(headcount: number): string {
  const sizes = allocateGroups(headcount)
  return `${sizes.length} group${sizes.length === 1 ? '' : 's'} · ${sizes.join(',')}`
}
