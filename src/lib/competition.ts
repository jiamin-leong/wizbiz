export type CompetitionStatus = 'upcoming' | 'active' | 'ended'

// Status is derived from the schedule, not the stored column: a competition is
// active only between its start date and the end of its end date (inclusive).
export function competitionStatus(
  startDate: Date | string,
  endDate: Date | string,
  now: Date = new Date()
): CompetitionStatus {
  const start = new Date(startDate)
  const endOfEndDay = new Date(endDate)
  endOfEndDay.setHours(23, 59, 59, 999)

  if (now < start) return 'upcoming'
  if (now > endOfEndDay) return 'ended'
  return 'active'
}
