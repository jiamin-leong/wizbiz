'use server'

import { db } from '@/db'
import {
  programmes, classes, teams, participants,
  competitions, groups, students, transfers, teachers, competitionOrganizers,
} from '@/db/schema'
import { eq, and, inArray, isNotNull, isNull } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { requireTeacher, requireAdminTeacher, getProgrammeAccess, getCompetitionAccess } from '@/lib/authz'
import { GROUP_THEMES, THEME_NAMES } from '@/lib/themes'
import {
  generateGroupPassword, generateGroupPasswords, allocateLoginCodes,
  JUDGE_PANEL_NAME, JUDGE_CODES, DEFAULT_JUDGE_COUNT, DEFAULT_JUDGE_BALANCE,
} from '@/lib/credentials'
import { allocateGroups, allocationError, MAX_GROUPS_PER_CLASS } from '@/lib/allocation'
import { computeStatements, rankStatements, ADVANCING_PER_CLASS } from '@/lib/standings'

// Each class reserves a block of MAX_GROUPS_PER_CLASS themes so no two classes
// in a programme can mint the same team name — which is what keeps login codes
// unique when 21 teams from 7 classes meet in the round 2 final.
const MAX_CLASSES = Math.floor(THEME_NAMES.length / MAX_GROUPS_PER_CLASS)

export async function createProgramme(formData: FormData) {
  const session = await requireAdminTeacher()

  const name = ((formData.get('name') as string) ?? '').trim()
  const classNames = formData.getAll('className').map(v => String(v).trim())
  const headcounts = formData.getAll('headcount').map(v => parseInt(String(v)))

  if (!name) return { error: 'Give the programme a name.' }

  const rows = classNames
    .map((n, i) => ({ name: n, headcount: headcounts[i] }))
    .filter(r => r.name.length > 0)

  if (rows.length === 0) return { error: 'Add at least one class.' }
  if (rows.length > MAX_CLASSES) {
    return { error: `A programme supports at most ${MAX_CLASSES} classes.` }
  }

  for (const r of rows) {
    const err = allocationError(r.headcount)
    if (err) return { error: `${r.name}: ${err}` }
  }

  const [programme] = await db
    .insert(programmes)
    .values({ ownerTeacherId: session.id, name })
    .returning()

  await db.insert(classes).values(
    rows.map((r, i) => ({
      programmeId: programme.id,
      name: r.name,
      headcount: r.headcount,
      themeOffset: i * MAX_GROUPS_PER_CLASS,
    }))
  )

  redirect(`/teacher/programmes/${programme.id}`)
}

/** Approved teacher accounts, for the class-teacher picker. */
export async function listAssignableTeachers() {
  await requireTeacher()
  return db
    .select({ id: teachers.id, name: teachers.name, email: teachers.email })
    .from(teachers)
    .where(isNotNull(teachers.approvedAt))
    .orderBy(teachers.name)
}

/**
 * Claims an unassigned class for yourself.
 *
 * Only unassigned classes can be claimed, so this is never a way to take a
 * class off a colleague — the programme owner reassigns those.
 */
export async function claimClass(classId: number) {
  const session = await requireTeacher()

  const [me] = await db
    .select({ approvedAt: teachers.approvedAt, name: teachers.name })
    .from(teachers)
    .where(eq(teachers.id, session.id))
  if (!me?.approvedAt) return { error: 'Your account is still waiting for approval.' }

  const [klass] = await db
    .select({ id: classes.id, name: classes.name, programmeId: classes.programmeId, teacherId: classes.teacherId })
    .from(classes)
    .where(eq(classes.id, classId))
  if (!klass) return { error: 'That class no longer exists.' }
  if (klass.teacherId === session.id) return { success: true, name: klass.name }
  if (klass.teacherId) return { error: 'Someone else already teaches that class.' }

  // Claim only if still unassigned, so two people clicking at once cannot both
  // take it.
  const claimed = await db
    .update(classes)
    .set({ teacherId: session.id })
    .where(and(eq(classes.id, classId), isNull(classes.teacherId)))
    .returning({ id: classes.id })
  if (claimed.length === 0) return { error: 'Someone else just claimed that class.' }

  // The class hackathon, if already launched, follows its teacher.
  await db
    .update(competitions)
    .set({ teacherId: session.id })
    .where(and(eq(competitions.classId, classId), eq(competitions.round, 1)))

  revalidatePath(`/teacher/programmes/${klass.programmeId}`)
  revalidatePath('/teacher')
  return { success: true, name: klass.name }
}

export async function releaseClass(classId: number) {
  const session = await requireTeacher()

  const [klass] = await db
    .select({ programmeId: classes.programmeId, teacherId: classes.teacherId })
    .from(classes)
    .where(eq(classes.id, classId))
  if (!klass) return { error: 'That class no longer exists.' }
  if (klass.teacherId !== session.id) return { error: 'That class is not yours to release.' }

  await db.update(classes).set({ teacherId: null }).where(eq(classes.id, classId))
  revalidatePath(`/teacher/programmes/${klass.programmeId}`)
  revalidatePath('/teacher')
  return { success: true }
}

export async function assignClassTeacher(classId: number, teacherId: number | null) {
  const session = await requireTeacher()

  const [klass] = await db
    .select({ id: classes.id, programmeId: classes.programmeId })
    .from(classes)
    .where(eq(classes.id, classId))
  if (!klass) return { error: 'Class not found' }

  const access = await getProgrammeAccess(klass.programmeId, session.id)
  if (!access?.isOwner) return { error: 'Only the programme owner can assign class teachers.' }

  if (teacherId === null) {
    await db.update(classes).set({ teacherId: null }).where(eq(classes.id, classId))
    revalidatePath(`/teacher/programmes/${klass.programmeId}`)
    return { success: true }
  }

  const [teacher] = await db
    .select({ id: teachers.id, name: teachers.name, approvedAt: teachers.approvedAt })
    .from(teachers)
    .where(eq(teachers.id, teacherId))
  if (!teacher) return { error: 'That teacher account no longer exists.' }
  if (!teacher.approvedAt) return { error: 'That account is still waiting for approval.' }

  await db.update(classes).set({ teacherId: teacher.id }).where(eq(classes.id, classId))
  revalidatePath(`/teacher/programmes/${klass.programmeId}`)
  return { success: true, name: teacher.name }
}

/**
 * Launch round 1: one competition per class, all sharing the same rules.
 * Teams, groups, participants and students are all created here, so credentials
 * are issued exactly once for the whole programme and stay valid in round 2.
 */
export async function launchRound1(programmeId: number, formData: FormData) {
  const session = await requireTeacher()
  const access = await getProgrammeAccess(programmeId, session.id)
  if (!access?.isOwner) return { error: 'Only the programme owner can launch round 1.' }

  const startDate = new Date(formData.get('startDate') as string)
  const endDate = new Date(formData.get('endDate') as string)
  const groupCapital = parseInt(formData.get('groupCapital') as string)
  const personalStartingBalance = parseInt(formData.get('personalStartingBalance') as string) || 0

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return { error: 'Pick a start and end date.' }
  if (endDate < startDate) return { error: 'The end date cannot be before the start date.' }
  if (!groupCapital || groupCapital < 1) return { error: 'Set the starting business capital.' }

  const classRows = await db
    .select()
    .from(classes)
    .where(eq(classes.programmeId, programmeId))
    .orderBy(classes.id)

  if (classRows.length === 0) return { error: 'This programme has no classes yet.' }

  const alreadyLaunched = await db
    .select({ id: competitions.id })
    .from(competitions)
    .where(and(eq(competitions.programmeId, programmeId), eq(competitions.round, 1)))
  if (alreadyLaunched.length > 0) return { error: 'Round 1 has already been launched for this programme.' }

  // Batched deliberately. Row-at-a-time inserts meant ~650 sequential round
  // trips to a database several thousand miles away, which took minutes; this
  // is a handful of multi-row statements per class instead.
  // Login codes and passwords must both be unique across the whole programme:
  // the code is the entire login, and the same 21 teams meet again in round 2.
  const teamCount = classRows.reduce((n, k) => n + allocateGroups(k.headcount).length, 0)
  const passwords = generateGroupPasswords(teamCount)
  const usedCodes = new Set<string>()
  const spareCodes = [...new Set(THEME_NAMES.flatMap(t => GROUP_THEMES[t]))]
  let passwordIndex = 0

  const plan = classRows.map(klass => {
    const sizes = allocateGroups(klass.headcount)
    return {
      klass,
      teamPlans: sizes.map((size, i) => {
        const theme = THEME_NAMES[(klass.themeOffset + i) % THEME_NAMES.length]
        return {
          theme,
          size,
          password: passwords[passwordIndex++],
          items: allocateLoginCodes(GROUP_THEMES[theme], size, usedCodes, spareCodes),
        }
      }),
    }
  })

  // One bcrypt hash per team, all at once rather than one after another.
  const allTeamPlans = plan.flatMap(p => p.teamPlans)
  const hashes = await Promise.all(allTeamPlans.map(t => bcrypt.hash(t.password, 10)))
  const hashByPassword = new Map(allTeamPlans.map((t, i) => [t.password, hashes[i]]))

  const createdCompetitions = await db
    .insert(competitions)
    .values(plan.map(({ klass }) => ({
      teacherId: klass.teacherId ?? session.id,
      name: klass.name,
      startDate,
      endDate,
      initialBalance: groupCapital,
      personalStartingBalance,
      status: 'active' as const,
      programmeId,
      classId: klass.id,
      round: 1,
    })))
    .returning({ id: competitions.id, classId: competitions.classId })

  const competitionByClass = new Map(createdCompetitions.map(c => [c.classId, c.id]))

  // The programme owner co-organises every class so they can moderate.
  const organiserRows = plan
    .filter(({ klass }) => klass.teacherId && klass.teacherId !== session.id)
    .map(({ klass }) => ({ competitionId: competitionByClass.get(klass.id)!, teacherId: session.id }))
  if (organiserRows.length > 0) {
    await db.insert(competitionOrganizers).values(organiserRows)
  }

  const createdTeams = await db
    .insert(teams)
    .values(plan.flatMap(({ klass, teamPlans }) =>
      teamPlans.map(t => ({ classId: klass.id, name: t.theme }))
    ))
    .returning({ id: teams.id, classId: teams.classId, name: teams.name })

  // Team names are unique within a class by construction (each class owns its
  // own block of themes), so class + name identifies a team unambiguously.
  const teamIdByKey = new Map(createdTeams.map(t => [`${t.classId}:${t.name}`, t.id]))

  const createdGroups = await db
    .insert(groups)
    .values(plan.flatMap(({ klass, teamPlans }) =>
      teamPlans.map(t => ({
        competitionId: competitionByClass.get(klass.id)!,
        name: t.theme,
        balance: groupCapital,
        startingCapital: groupCapital,
        groupPassword: t.password,
        groupPasswordHash: hashByPassword.get(t.password)!,
        teamId: teamIdByKey.get(`${klass.id}:${t.theme}`)!,
      }))
    ))
    .returning({ id: groups.id, competitionId: groups.competitionId, name: groups.name })

  const groupIdByKey = new Map(createdGroups.map(g => [`${g.competitionId}:${g.name}`, g.id]))

  const createdParticipants = await db
    .insert(participants)
    .values(plan.flatMap(({ klass, teamPlans }) =>
      teamPlans.flatMap(t => t.items.map(item => ({
        programmeId,
        classId: klass.id,
        teamId: teamIdByKey.get(`${klass.id}:${t.theme}`)!,
        loginCode: item,
        passwordHash: hashByPassword.get(t.password)!,
      })))
    ))
    .returning({ id: participants.id, loginCode: participants.loginCode })

  // Login codes are unique across the whole programme, so this is 1:1.
  const participantIdByCode = new Map(createdParticipants.map(p => [p.loginCode, p.id]))

  await db.insert(students).values(
    plan.flatMap(({ klass, teamPlans }) =>
      teamPlans.flatMap(t => t.items.map(item => {
        const loginCode = item
        return {
          groupId: groupIdByKey.get(`${competitionByClass.get(klass.id)!}:${t.theme}`)!,
          loginCode,
          passwordHash: hashByPassword.get(t.password)!,
          personalBalance: personalStartingBalance,
          participantId: participantIdByCode.get(loginCode)!,
        }
      }))
    )
  )

  revalidatePath(`/teacher/programmes/${programmeId}`)
  redirect(`/teacher/programmes/${programmeId}`)
}

/** Statements for one competition, ranked by the published advancement metric. */
export async function loadRankedStatements(competitionId: number) {
  const [competition] = await db
    .select({ initialBalance: competitions.initialBalance })
    .from(competitions)
    .where(eq(competitions.id, competitionId))
  if (!competition) return []

  const groupRows = await db
    .select({
      id: groups.id,
      name: groups.name,
      balance: groups.balance,
      teamId: groups.teamId,
      startingCapital: groups.startingCapital,
      qualified: groups.qualified,
      qualifiedRank: groups.qualifiedRank,
    })
    .from(groups)
    // Judges and spectators hold wallets but are not businesses — they never rank.
    .where(and(eq(groups.competitionId, competitionId), eq(groups.kind, 'team')))

  const groupIds = groupRows.map(g => g.id)
  if (groupIds.length === 0) return []

  const [studentRows, transferRows] = await Promise.all([
    db.select({ groupId: students.groupId }).from(students).where(inArray(students.groupId, groupIds)),
    db.select({
      fromGroupId: transfers.fromGroupId,
      toGroupId: transfers.toGroupId,
      toStore: transfers.toStore,
      fromPersonal: transfers.fromPersonal,
      amount: transfers.amount,
    }).from(transfers),
  ])

  return rankStatements(
    computeStatements({
      groups: groupRows,
      students: studentRows,
      transfers: transferRows.filter(
        t => groupIds.includes(t.fromGroupId) || (t.toGroupId !== null && groupIds.includes(t.toGroupId))
      ),
      fallbackStartingCapital: competition.initialBalance,
    })
  )
}

/**
 * Record which teams advance. Written once, deliberately — a late transaction
 * landing after this point must not silently re-rank the field.
 */
export async function confirmAdvancement(competitionId: number, groupIds: number[]) {
  const session = await requireTeacher()
  const access = await getCompetitionAccess(competitionId, session.id)
  if (!access?.canAdvance) return { error: 'You cannot confirm advancement for this class.' }

  const unique = [...new Set(groupIds)]
  if (unique.length !== ADVANCING_PER_CLASS) {
    return { error: `Select exactly ${ADVANCING_PER_CLASS} teams.` }
  }

  const owned = await db
    .select({ id: groups.id })
    .from(groups)
    .where(and(eq(groups.competitionId, competitionId), inArray(groups.id, unique)))
  if (owned.length !== unique.length) return { error: 'Those teams are not all in this class.' }

  await db
    .update(groups)
    .set({ qualified: false, qualifiedRank: null })
    .where(eq(groups.competitionId, competitionId))

  for (let i = 0; i < unique.length; i++) {
    await db
      .update(groups)
      .set({ qualified: true, qualifiedRank: i + 1 })
      .where(eq(groups.id, unique[i]))
  }

  revalidatePath(`/teacher/competitions/${competitionId}`)
  if (access.programmeId) revalidatePath(`/teacher/programmes/${access.programmeId}`)
  return { success: true }
}

export async function clearAdvancement(competitionId: number) {
  const session = await requireTeacher()
  const access = await getCompetitionAccess(competitionId, session.id)
  if (!access?.canAdvance) return { error: 'You cannot change advancement for this class.' }

  await db
    .update(groups)
    .set({ qualified: false, qualifiedRank: null })
    .where(eq(groups.competitionId, competitionId))

  revalidatePath(`/teacher/competitions/${competitionId}`)
  if (access.programmeId) revalidatePath(`/teacher/programmes/${access.programmeId}`)
  return { success: true }
}

/**
 * Build the round 2 final from the confirmed teams. Teams and people keep their
 * identity — same team, same login code, same password — and their round 1
 * balances carry forward, business and personal alike.
 *
 * Round 2 P/L is measured against the carried balance, so the final scores what
 * a team does in the final rather than re-counting round 1 profit.
 */
export async function createMasterHackathon(programmeId: number, formData: FormData) {
  const session = await requireTeacher()
  const access = await getProgrammeAccess(programmeId, session.id)
  if (!access?.isOwner) return { error: 'Only the programme owner can create the final.' }

  const name = ((formData.get('name') as string) ?? '').trim() || 'Master Hackathon'
  const startDate = new Date(formData.get('startDate') as string)
  const endDate = new Date(formData.get('endDate') as string)
  const topUp = parseInt(formData.get('topUp') as string) || 0
  const personalTopUp = parseInt(formData.get('personalTopUp') as string) || 0
  const includeSpectators = formData.get('includeSpectators') !== null
  const judgeCount = parseInt(formData.get('judgeCount') as string) || DEFAULT_JUDGE_COUNT
  const judgeBalance = parseInt(formData.get('judgeBalance') as string) || DEFAULT_JUDGE_BALANCE

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return { error: 'Pick a start and end date.' }
  if (endDate < startDate) return { error: 'The end date cannot be before the start date.' }
  if (topUp < 0 || personalTopUp < 0) return { error: 'Top-ups cannot be negative.' }
  if (judgeCount < 0 || judgeCount > JUDGE_CODES.length) {
    return { error: `Between 0 and ${JUDGE_CODES.length} judges.` }
  }
  if (judgeBalance < 0) return { error: 'Judge balance cannot be negative.' }

  const existing = await db
    .select({ id: competitions.id })
    .from(competitions)
    .where(and(eq(competitions.programmeId, programmeId), eq(competitions.round, 2)))
  if (existing.length > 0) return { error: 'The final has already been created.' }

  const round1 = await db
    .select({ id: competitions.id, classId: competitions.classId, name: competitions.name })
    .from(competitions)
    .where(and(eq(competitions.programmeId, programmeId), eq(competitions.round, 1)))
  if (round1.length === 0) return { error: 'Round 1 has not been launched yet.' }

  const round1Ids = round1.map(c => c.id)
  const qualifiedGroups = await db
    .select({
      id: groups.id,
      name: groups.name,
      balance: groups.balance,
      teamId: groups.teamId,
      groupPassword: groups.groupPassword,
      groupPasswordHash: groups.groupPasswordHash,
      qualifiedRank: groups.qualifiedRank,
      competitionId: groups.competitionId,
    })
    .from(groups)
    .where(and(inArray(groups.competitionId, round1Ids), eq(groups.qualified, true)))

  const unconfirmed = round1.filter(c => !qualifiedGroups.some(g => g.competitionId === c.id))
  if (unconfirmed.length > 0) {
    return { error: `Still waiting on: ${unconfirmed.map(c => c.name).join(', ')}` }
  }

  const [master] = await db
    .insert(competitions)
    .values({
      teacherId: session.id,
      name,
      startDate,
      endDate,
      // Balances are carried per team, so this is only the top-up applied on
      // entry; group.startingCapital holds each team's real opening figure.
      initialBalance: topUp,
      personalStartingBalance: personalTopUp,
      status: 'active',
      programmeId,
      classId: null,
      round: 2,
    })
    .returning()

  // Every class teacher moderates the final — one approval queue for ~130
  // students is otherwise a single point of failure.
  const classTeachers = await db
    .select({ teacherId: classes.teacherId })
    .from(classes)
    .where(eq(classes.programmeId, programmeId))
  const coOrganiserIds = [...new Set(
    classTeachers.map(c => c.teacherId).filter((id): id is number => id !== null && id !== session.id)
  )]
  if (coOrganiserIds.length > 0) {
    await db.insert(competitionOrganizers).values(
      coOrganiserIds.map(teacherId => ({ competitionId: master.id, teacherId }))
    )
  }

  for (const source of qualifiedGroups) {
    const members = await db
      .select({
        loginCode: students.loginCode,
        passwordHash: students.passwordHash,
        participantId: students.participantId,
        personalBalance: students.personalBalance,
      })
      .from(students)
      .where(eq(students.groupId, source.id))

    // Carry the round 1 closing balance forward, plus any top-up. This is also
    // the round 2 starting capital, so round 2 P/L opens at zero.
    const startingCapital = source.balance + topUp

    const [group] = await db
      .insert(groups)
      .values({
        competitionId: master.id,
        name: source.name,
        balance: startingCapital,
        startingCapital,
        // Same credentials as round 1 — nothing to reissue on finals day.
        groupPassword: source.groupPassword,
        groupPasswordHash: source.groupPasswordHash,
        teamId: source.teamId,
      })
      .returning()

    if (members.length > 0) {
      await db.insert(students).values(
        members.map(m => ({
          groupId: group.id,
          loginCode: m.loginCode,
          passwordHash: m.passwordHash,
          personalBalance: m.personalBalance + personalTopUp,
          participantId: m.participantId,
        }))
      )
    }
  }

  // Non-finalists come along as spectators: same logins, personal wallets
  // carried forward so they can keep buying, business wallets zeroed so a
  // knocked-out team cannot bankroll a finalist.
  if (includeSpectators) {
    const others = await db
      .select({
        id: groups.id, name: groups.name, teamId: groups.teamId,
        groupPassword: groups.groupPassword, groupPasswordHash: groups.groupPasswordHash,
      })
      .from(groups)
      .where(and(
        inArray(groups.competitionId, round1Ids),
        eq(groups.qualified, false),
        eq(groups.kind, 'team'),
      ))

    for (const source of others) {
      const members = await db
        .select({
          loginCode: students.loginCode,
          passwordHash: students.passwordHash,
          participantId: students.participantId,
          personalBalance: students.personalBalance,
        })
        .from(students)
        .where(eq(students.groupId, source.id))

      if (members.length === 0) continue

      const [group] = await db
        .insert(groups)
        .values({
          competitionId: master.id,
          name: source.name,
          balance: 0,
          startingCapital: 0,
          groupPassword: source.groupPassword,
          groupPasswordHash: source.groupPasswordHash,
          teamId: source.teamId,
          kind: 'spectators' as const,
        })
        .returning()

      await db.insert(students).values(
        members.map(m => ({
          groupId: group.id,
          loginCode: m.loginCode,
          passwordHash: m.passwordHash,
          personalBalance: m.personalBalance + personalTopUp,
          participantId: m.participantId,
        }))
      )
    }
  }

  if (judgeCount > 0) {
    const judgePassword = generateGroupPassword()
    const judgePasswordHash = await bcrypt.hash(judgePassword, 10)

    const [judgeGroup] = await db
      .insert(groups)
      .values({
        competitionId: master.id,
        name: JUDGE_PANEL_NAME,
        balance: 0,
        startingCapital: 0,
        groupPassword: judgePassword,
        groupPasswordHash: judgePasswordHash,
        kind: 'judges' as const,
      })
      .returning()

    await db.insert(students).values(
      JUDGE_CODES.slice(0, judgeCount).map(loginCode => ({
        groupId: judgeGroup.id,
        loginCode,
        passwordHash: judgePasswordHash,
        personalBalance: judgeBalance,
      }))
    )
  }

  revalidatePath(`/teacher/programmes/${programmeId}`)
  redirect(`/teacher/competitions/${master.id}`)
}

