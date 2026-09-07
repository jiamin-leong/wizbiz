import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { db } from '@/db'
import { teachers, competitions, competitionOrganizers, programmes, classes } from '@/db/schema'
import { eq, desc } from 'drizzle-orm'
import { competitionStatus } from '@/lib/competition'
import TeacherShell from './TeacherShell'
import PendingApproval from './PendingApproval'

export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session || session.role !== 'teacher') redirect('/')

  // The sidebar lists competitions this teacher is responsible for: ones they
  // own, ones they co-organise, and the hackathon of any class they teach —
  // so a claimed class shows up here. Browsing another class's hackathon
  // happens from the programme page and deliberately does not list here.
  const [teacher, ownedComps, coOrgComps, myClassComps, allProgrammeComps] = await Promise.all([
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
    db.select({ id: competitions.id, name: competitions.name, startDate: competitions.startDate, endDate: competitions.endDate })
      .from(competitions)
      .innerJoin(classes, eq(classes.id, competitions.classId))
      .where(eq(classes.teacherId, session.id))
      .orderBy(desc(competitions.createdAt)),
    // Every competition belonging to a programme, so the sidebar can nest them
    // under their programme rather than listing them all flat.
    db.select({
      id: competitions.id, name: competitions.name, programmeId: competitions.programmeId,
      startDate: competitions.startDate, endDate: competitions.endDate, round: competitions.round,
    })
      .from(competitions)
      .orderBy(competitions.round, competitions.id),
  ])

  // Pending teachers can sign in and see where they stand, but no content.
  if (teacher && !teacher.approvedAt) {
    return <PendingApproval name={teacher.name} email={teacher.email} />
  }

  // Every approved teacher sees every programme, so they can find and claim
  // their class. The dot marks the ones they already teach.
  const programmeRows = await db
    .select({ id: programmes.id, name: programmes.name })
    .from(programmes)
    .orderBy(programmes.id)

  const programmeClasses = programmeRows.length > 0
    ? await db
        .select({ programmeId: classes.programmeId, teacherId: classes.teacherId })
        .from(classes)
    : []

  const programmeList = programmeRows.map(p => {
    const rows = programmeClasses.filter(c => c.programmeId === p.id)
    return {
      id: p.id,
      name: p.name,
      mine: rows.some(c => c.teacherId === session.id),
      unclaimed: rows.filter(c => c.teacherId === null).length,
      competitions: [] as { id: number; name: string; status: string; programmeId: number | null }[],
    }
  })

  const seen = new Set<number>()
  const allCompetitions = [...ownedComps, ...coOrgComps, ...myClassComps].filter(c => {
    if (seen.has(c.id)) return false
    seen.add(c.id)
    return true
  })

  for (const p of programmeList) {
    p.competitions = allProgrammeComps
      .filter(c => c.programmeId === p.id)
      .map(c => ({
        id: c.id,
        name: c.name,
        status: competitionStatus(c.startDate, c.endDate),
        programmeId: c.programmeId,
      }))
  }

  // Only standalone competitions stay in the flat lists; programme ones are
  // nested under their programme above.
  const standalone = allCompetitions.filter(c => !allProgrammeComps.some(pc => pc.id === c.id))
  const upcoming = standalone.filter(c => competitionStatus(c.startDate, c.endDate) === 'upcoming')
  const active = standalone.filter(c => competitionStatus(c.startDate, c.endDate) === 'active')
  const past = standalone.filter(c => competitionStatus(c.startDate, c.endDate) === 'ended')

  return (
    <TeacherShell
      teacher={teacher}
      isAdmin={teacher?.isAdmin ?? false}
      programmes={programmeList}
      upcoming={upcoming}
      active={active}
      past={past}
    >
      {children}
    </TeacherShell>
  )
}
