import { db } from '@/db'
import { competitions, competitionOrganizers, classes, programmes, teachers, groups, students, listings } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'

export type TeacherSession = { role: 'teacher'; id: number; email: string; isAdmin?: boolean }

export async function requireTeacher(): Promise<TeacherSession> {
  const session = await getSession()
  if (!session || session.role !== 'teacher') redirect('/')
  return session
}

/**
 * Creating programmes and standalone competitions is reserved for admins;
 * everything else a teacher can do is unchanged.
 */
export async function requireAdminTeacher(): Promise<TeacherSession> {
  const session = await requireTeacher()
  if (!session.isAdmin) redirect('/teacher')
  return session
}

export async function isAdmin(): Promise<boolean> {
  const session = await getSession()
  return session?.role === 'teacher' && session.isAdmin === true
}

export type CompetitionRole =
  | 'owner'
  | 'programme-owner'
  | 'class-teacher'
  | 'co-organiser'

export type CompetitionAccess = {
  role: CompetitionRole
  /** Roster, teams, dates, balances. */
  canManage: boolean
  /** Approve, edit and reject listings. */
  canModerate: boolean
  /** Confirm which teams advance to round 2. */
  canAdvance: boolean
  /** Add and remove co-organisers. */
  canManageOrganisers: boolean
  programmeId: number | null
  classId: number | null
  round: number
}

const ROLE_LABELS: Record<CompetitionRole, string> = {
  'owner': 'Owner',
  'programme-owner': 'Programme owner',
  'class-teacher': 'Class teacher',
  'co-organiser': 'Co-organiser',
}

export function roleLabel(role: CompetitionRole): string {
  return ROLE_LABELS[role]
}

/**
 * Resolve what a teacher may do in one competition. Returns null when they have
 * no relationship to it at all — callers treat that as "not found".
 *
 * Co-organisers are deliberately narrower than owners: they moderate the
 * marketplace but never touch the roster or the advancement decision.
 */
export async function getCompetitionAccess(
  competitionId: number,
  teacherId: number
): Promise<CompetitionAccess | null> {
  const [competition] = await db
    .select({
      id: competitions.id,
      teacherId: competitions.teacherId,
      programmeId: competitions.programmeId,
      classId: competitions.classId,
      round: competitions.round,
    })
    .from(competitions)
    .where(eq(competitions.id, competitionId))

  if (!competition) return null

  const base = {
    programmeId: competition.programmeId,
    classId: competition.classId,
    round: competition.round,
  }

  const full = (role: CompetitionRole): CompetitionAccess => ({
    ...base,
    role,
    canManage: true,
    canModerate: true,
    canAdvance: true,
    canManageOrganisers: role === 'owner' || role === 'programme-owner',
  })

  if (competition.teacherId === teacherId) return full('owner')

  if (competition.programmeId) {
    const [programme] = await db
      .select({ ownerTeacherId: programmes.ownerTeacherId })
      .from(programmes)
      .where(eq(programmes.id, competition.programmeId))
    if (programme?.ownerTeacherId === teacherId) return full('programme-owner')
  }

  if (competition.classId) {
    const [klass] = await db
      .select({ teacherId: classes.teacherId })
      .from(classes)
      .where(eq(classes.id, competition.classId))
    if (klass?.teacherId === teacherId) return full('class-teacher')
  }

  const [coOrg] = await db
    .select({ id: competitionOrganizers.id })
    .from(competitionOrganizers)
    .where(and(
      eq(competitionOrganizers.competitionId, competitionId),
      eq(competitionOrganizers.teacherId, teacherId)
    ))

  if (coOrg) {
    return {
      ...base,
      role: 'co-organiser',
      canManage: false,
      canModerate: true,
      canAdvance: false,
      canManageOrganisers: false,
    }
  }

  return null
}

/** Competition ids this teacher can see: owned, programme-owned, class-taught, co-organised. */
export async function visibleCompetitionIds(teacherId: number): Promise<number[]> {
  const [owned, viaProgramme, viaClass, viaCoOrg] = await Promise.all([
    db.select({ id: competitions.id }).from(competitions).where(eq(competitions.teacherId, teacherId)),
    db.select({ id: competitions.id })
      .from(competitions)
      .innerJoin(programmes, eq(programmes.id, competitions.programmeId))
      .where(eq(programmes.ownerTeacherId, teacherId)),
    db.select({ id: competitions.id })
      .from(competitions)
      .innerJoin(classes, eq(classes.id, competitions.classId))
      .where(eq(classes.teacherId, teacherId)),
    db.select({ id: competitionOrganizers.competitionId })
      .from(competitionOrganizers)
      .where(eq(competitionOrganizers.teacherId, teacherId)),
  ])

  const ids = new Set<number>()
  for (const r of owned) ids.add(r.id)
  for (const r of viaProgramme) ids.add(r.id)
  for (const r of viaClass) ids.add(r.id)
  for (const r of viaCoOrg) ids.add(r.id)
  return [...ids]
}

export type ProgrammeAccess = {
  isOwner: boolean
  /** Class ids this teacher is the form teacher for. */
  ownClassIds: number[]
}

/**
 * Any approved teacher may look at a programme and claim an unassigned class;
 * only the owner may change its shape. Opening a class's hackathon is a
 * separate check, so browsing a programme does not expose another class's
 * students.
 */
export async function getProgrammeAccess(
  programmeId: number,
  teacherId: number
): Promise<ProgrammeAccess | null> {
  const [programme] = await db
    .select({ ownerTeacherId: programmes.ownerTeacherId })
    .from(programmes)
    .where(eq(programmes.id, programmeId))
  if (!programme) return null

  const [me] = await db
    .select({ approvedAt: teachers.approvedAt })
    .from(teachers)
    .where(eq(teachers.id, teacherId))
  if (!me?.approvedAt) return null

  const own = await db
    .select({ id: classes.id })
    .from(classes)
    .where(and(eq(classes.programmeId, programmeId), eq(classes.teacherId, teacherId)))

  return { isOwner: programme.ownerTeacherId === teacherId, ownClassIds: own.map(c => c.id) }
}

// ── Resolving a child record back to its competition ────────────────────────
// These exist because the teacher actions took a groupId / studentId / listingId
// and never checked which competition it belonged to.

export async function competitionIdForGroup(groupId: number): Promise<number | null> {
  const [row] = await db.select({ competitionId: groups.competitionId }).from(groups).where(eq(groups.id, groupId))
  return row?.competitionId ?? null
}

export async function competitionIdForStudent(studentId: number): Promise<number | null> {
  const [row] = await db
    .select({ competitionId: groups.competitionId })
    .from(students)
    .innerJoin(groups, eq(groups.id, students.groupId))
    .where(eq(students.id, studentId))
  return row?.competitionId ?? null
}

export async function competitionIdForListing(listingId: number): Promise<number | null> {
  const [row] = await db
    .select({ competitionId: groups.competitionId })
    .from(listings)
    .innerJoin(groups, eq(groups.id, listings.groupId))
    .where(eq(listings.id, listingId))
  return row?.competitionId ?? null
}
