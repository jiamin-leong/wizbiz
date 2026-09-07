import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { db } from '@/db'
import { teachers, competitions, competitionOrganizers } from '@/db/schema'
import { eq, desc } from 'drizzle-orm'
import { competitionStatus } from '@/lib/competition'
import TeacherShell from './TeacherShell'
import PendingApproval from './PendingApproval'

export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session || session.role !== 'teacher') redirect('/')

  const [teacher, ownedComps, coOrgComps] = await Promise.all([
    db.select({ name: teachers.name, email: teachers.email, isAdmin: teachers.isAdmin, approvedAt: teachers.approvedAt })
      .from(teachers)
      .where(eq(teachers.id, session.id))
      .then(r => r[0]),
    db.select({ id: competitions.id, name: competitions.name, startDate: competitions.startDate, endDate: competitions.endDate })
      .from(competitions)
      .where(eq(competitions.teacherId, session.id))
      .orderBy(desc(competitions.createdAt)),
    db.select({ id: competitions.id, name: competitions.name, startDate: competitions.startDate, endDate: competitions.endDate })
      .from(competitionOrganizers)
      .innerJoin(competitions, eq(competitions.id, competitionOrganizers.competitionId))
      .where(eq(competitionOrganizers.teacherId, session.id))
      .orderBy(desc(competitions.createdAt)),
  ])

  // Pending teachers can sign in and see where they stand, but no content.
  if (teacher && !teacher.approvedAt) {
    return <PendingApproval name={teacher.name} email={teacher.email} />
  }

  const seen = new Set<number>()
  const allCompetitions = [...ownedComps, ...coOrgComps].filter(c => {
    if (seen.has(c.id)) return false
    seen.add(c.id)
    return true
  })

  const upcoming = allCompetitions.filter(c => competitionStatus(c.startDate, c.endDate) === 'upcoming')
  const active = allCompetitions.filter(c => competitionStatus(c.startDate, c.endDate) === 'active')
  const past = allCompetitions.filter(c => competitionStatus(c.startDate, c.endDate) === 'ended')

  return (
    <TeacherShell teacher={teacher} isAdmin={teacher?.isAdmin ?? false} upcoming={upcoming} active={active} past={past}>
      {children}
    </TeacherShell>
  )
}
