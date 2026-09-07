'use server'

import { db } from '@/db'
import { competitions, groups, students, teachers, competitionOrganizers } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import { getSession, createSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { GROUP_THEMES, THEME_NAMES } from '@/lib/themes'
import { generateGroupPassword, shuffle } from '@/lib/credentials'
import {
  requireTeacher,
  getCompetitionAccess,
  competitionIdForGroup,
  competitionIdForStudent,
  competitionIdForListing,
} from '@/lib/authz'

const DENIED = { error: 'You do not have access to that competition.' }

export async function createCompetition(formData: FormData) {
  const session = await getSession()
  if (!session || session.role !== 'teacher') redirect('/')

  const name = formData.get('name') as string
  const startDate = new Date(formData.get('startDate') as string)
  const endDate = new Date(formData.get('endDate') as string)
  const initialBalance = parseInt(formData.get('initialBalance') as string)
  const personalStartingBalance = parseInt(formData.get('personalStartingBalance') as string) || 0
  const numGroups = parseInt(formData.get('numGroups') as string)
  const studentsPerGroup = Math.min(parseInt(formData.get('studentsPerGroup') as string), 20)

  const [competition] = await db
    .insert(competitions)
    .values({ teacherId: session.id, name, startDate, endDate, initialBalance, personalStartingBalance, status: 'active' })
    .returning()

  for (let g = 0; g < numGroups; g++) {
    const theme = THEME_NAMES[g % THEME_NAMES.length]
    const items = shuffle(GROUP_THEMES[theme]).slice(0, studentsPerGroup)
    const groupPassword = generateGroupPassword()
    const groupPasswordHash = await bcrypt.hash(groupPassword, 10)

    const [group] = await db
      .insert(groups)
      .values({
        competitionId: competition.id,
        name: theme,
        balance: initialBalance,
        startingCapital: initialBalance,
        groupPassword,
        groupPasswordHash,
      })
      .returning()

    const studentCodes = items.map(item => ({
      groupId: group.id,
      loginCode: `${theme.toUpperCase()}-${item}`,
      passwordHash: groupPasswordHash,
      personalBalance: personalStartingBalance,
    }))

    await db.insert(students).values(studentCodes)
  }

  redirect(`/teacher/competitions/${competition.id}`)
}

export async function addCoOrganizer(competitionId: number, email: string) {
  const session = await getSession()
  if (!session || session.role !== 'teacher') redirect('/')

  const access = await getCompetitionAccess(competitionId, session.id)
  if (!access) return DENIED
  if (!access.canManageOrganisers) return { error: 'Only the competition owner can add co-organisers' }

  const [teacher] = await db.select({ id: teachers.id, name: teachers.name })
    .from(teachers)
    .where(eq(teachers.email, email.toLowerCase().trim()))
  if (!teacher) return { error: 'No teacher account found with that email' }
  if (teacher.id === session.id) return { error: 'You are already the owner' }

  const [existing] = await db.select({ id: competitionOrganizers.id })
    .from(competitionOrganizers)
    .where(and(eq(competitionOrganizers.competitionId, competitionId), eq(competitionOrganizers.teacherId, teacher.id)))
  if (existing) return { error: `${teacher.name} is already a co-organiser` }

  await db.insert(competitionOrganizers).values({ competitionId, teacherId: teacher.id })
  return { success: true }
}

export async function removeCoOrganizer(competitionId: number, coTeacherId: number) {
  const session = await getSession()
  if (!session || session.role !== 'teacher') redirect('/')

  const access = await getCompetitionAccess(competitionId, session.id)
  if (!access) return DENIED
  if (!access.canManageOrganisers) return { error: 'Only the competition owner can remove co-organisers' }

  await db.delete(competitionOrganizers)
    .where(and(eq(competitionOrganizers.competitionId, competitionId), eq(competitionOrganizers.teacherId, coTeacherId)))
}

export async function updateCompetition(competitionId: number, name: string, startDate: string, endDate: string) {
  const session = await requireTeacher()
  const access = await getCompetitionAccess(competitionId, session.id)
  if (!access) return DENIED
  if (!access.canManage) return { error: 'Co-organisers cannot edit competition settings.' }

  await db
    .update(competitions)
    .set({ name, startDate: new Date(startDate), endDate: new Date(endDate) })
    .where(eq(competitions.id, competitionId))
}

export async function previewAsStudent(groupId: number) {
  const session = await requireTeacher()

  const [group] = await db.select().from(groups).where(eq(groups.id, groupId))
  if (!group) return { error: 'Group not found' }

  const access = await getCompetitionAccess(group.competitionId, session.id)
  if (!access) return DENIED

  const [firstStudent] = await db.select({ id: students.id }).from(students).where(eq(students.groupId, groupId))
  if (!firstStudent) return { error: 'No students in this group yet' }

  const { cookies } = await import('next/headers')
  const cookieStore = await cookies()
  cookieStore.set('preview_teacher_id', String(session.id), { httpOnly: true, path: '/', sameSite: 'lax' })

  await createSession({ role: 'student', id: firstStudent.id, groupId, competitionId: group.competitionId })
  redirect('/student')
}

export async function renameGroup(groupId: number, name: string) {
  const session = await requireTeacher()

  const competitionId = await competitionIdForGroup(groupId)
  if (!competitionId) return { error: 'Group not found' }
  const access = await getCompetitionAccess(competitionId, session.id)
  if (!access) return DENIED
  if (!access.canManage) return { error: 'Co-organisers cannot rename teams.' }

  await db.update(groups).set({ name }).where(eq(groups.id, groupId))
}

export async function removeStudent(studentId: number) {
  const session = await requireTeacher()

  const competitionId = await competitionIdForStudent(studentId)
  if (!competitionId) return { error: 'Student not found' }
  const access = await getCompetitionAccess(competitionId, session.id)
  if (!access) return DENIED
  if (!access.canManage) return { error: 'Co-organisers cannot change the roster.' }

  try {
    await db.delete(students).where(eq(students.id, studentId))
  } catch {
    return { error: 'Cannot remove a student who has made transactions.' }
  }
}

export async function addStudent(groupId: number) {
  const session = await requireTeacher()

  const [group] = await db.select().from(groups).where(eq(groups.id, groupId))
  if (!group) return { error: 'Group not found' }

  const access = await getCompetitionAccess(group.competitionId, session.id)
  if (!access) return DENIED
  if (!access.canManage) return { error: 'Co-organisers cannot change the roster.' }

  const [competition] = await db
    .select({ personalStartingBalance: competitions.personalStartingBalance })
    .from(competitions)
    .where(eq(competitions.id, group.competitionId))

  const existingStudents = await db
    .select({ loginCode: students.loginCode })
    .from(students)
    .where(eq(students.groupId, groupId))

  const existingCodes = new Set(existingStudents.map(s => s.loginCode))

  // Infer theme from existing codes or fall back to group name
  let themeName: string
  if (existingStudents.length > 0) {
    const themeUpper = existingStudents[0].loginCode.split('-')[0]
    themeName = themeUpper[0] + themeUpper.slice(1).toLowerCase()
  } else {
    themeName = group.name
  }

  const items = GROUP_THEMES[themeName]
  if (!items) return { error: 'Cannot determine theme for this group' }

  const themeUpper = themeName.toUpperCase()
  const unusedItem = items.find(item => !existingCodes.has(`${themeUpper}-${item}`))
  if (!unusedItem) return { error: 'All slots are full for this group (maximum 20 participants)' }

  await db.insert(students).values({
    groupId,
    loginCode: `${themeUpper}-${unusedItem}`,
    passwordHash: group.groupPasswordHash,
    personalBalance: competition?.personalStartingBalance ?? 0,
  })
}

export async function updateListingStatus(
  listingId: number,
  status: 'approved' | 'rejected',
  editedName?: string,
  editedDescription?: string,
  editedPrice?: number
) {
  const session = await requireTeacher()

  const competitionId = await competitionIdForListing(listingId)
  if (!competitionId) return { error: 'Listing not found' }
  const access = await getCompetitionAccess(competitionId, session.id)
  if (!access) return DENIED
  if (!access.canModerate) return DENIED

  const { listings } = await import('@/db/schema')
  await db
    .update(listings)
    .set({
      status,
      ...(editedName && { name: editedName }),
      ...(editedDescription !== undefined && { description: editedDescription }),
      ...(editedPrice && { price: editedPrice }),
    })
    .where(eq(listings.id, listingId))
}
