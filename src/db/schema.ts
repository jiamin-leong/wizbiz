import { pgTable, serial, text, integer, timestamp, pgEnum, numeric, uniqueIndex, boolean } from 'drizzle-orm/pg-core'

export const listingStatusEnum = pgEnum('listing_status', ['pending', 'approved', 'rejected'])
export const competitionStatusEnum = pgEnum('competition_status', ['active', 'ended'])
// Only 'team' competes. Judges and spectators hold wallets and logins so they
// can buy from the finalists, but never sell, never receive, never rank.
export const groupKindEnum = pgEnum('group_kind', ['team', 'judges', 'spectators'])

export const teachers = pgTable('teachers', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  // Null for teachers who joined by invite and sign in by email link only.
  passwordHash: text('password_hash'),
  name: text('name').notNull(),
  // Admins reach the admin panel from inside the teacher portal, rather than
  // through a separate login.
  isAdmin: boolean('is_admin').notNull().default(false),
  // Null until an admin approves the sign-up request. A pending account exists
  // but cannot sign in.
  approvedAt: timestamp('approved_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// Single-use invitations. Teacher accounts can read student names, balances and
// credentials, so accounts are created by invitation rather than open sign-up.
// A code may be bound to a class, in which case redeeming it also makes that
// person the class teacher.
export const invites = pgTable('invites', {
  id: serial('id').primaryKey(),
  code: text('code').notNull().unique(),
  label: text('label').notNull().default(''),
  classId: integer('class_id'),
  usedAt: timestamp('used_at'),
  usedByTeacherId: integer('used_by_teacher_id').references(() => teachers.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// Single-use sign-in links. Only a hash of the token is stored, so a leaked
// database row cannot be used to log in.
export const loginTokens = pgTable('login_tokens', {
  id: serial('id').primaryKey(),
  teacherId: integer('teacher_id').references(() => teachers.id).notNull(),
  tokenHash: text('token_hash').notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  usedAt: timestamp('used_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// A programme is a whole year-group run: one owner, many classes, two rounds.
export const programmes = pgTable('programmes', {
  id: serial('id').primaryKey(),
  ownerTeacherId: integer('owner_teacher_id').references(() => teachers.id).notNull(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// themeOffset reserves a block of group themes so no two classes in a
// programme can produce the same team name — and so login codes stay unique
// across all 21 teams that meet in the round 2 final.
export const classes = pgTable('classes', {
  id: serial('id').primaryKey(),
  programmeId: integer('programme_id').references(() => programmes.id).notNull(),
  teacherId: integer('teacher_id').references(() => teachers.id),
  name: text('name').notNull(),
  headcount: integer('headcount').notNull(),
  themeOffset: integer('theme_offset').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// Stable business identity. A `groups` row is this team's entry in one round.
export const teams = pgTable('teams', {
  id: serial('id').primaryKey(),
  classId: integer('class_id').references(() => classes.id).notNull(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// Stable person. A `students` row is this person's participation in one round.
export const participants = pgTable('participants', {
  id: serial('id').primaryKey(),
  programmeId: integer('programme_id').references(() => programmes.id).notNull(),
  classId: integer('class_id').references(() => classes.id).notNull(),
  teamId: integer('team_id').references(() => teams.id).notNull(),
  loginCode: text('login_code').notNull(),
  passwordHash: text('password_hash').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => [
  uniqueIndex('participants_programme_login_code_idx').on(t.programmeId, t.loginCode),
])

export const competitions = pgTable('competitions', {
  id: serial('id').primaryKey(),
  teacherId: integer('teacher_id').references(() => teachers.id).notNull(),
  name: text('name').notNull(),
  startDate: timestamp('start_date').notNull(),
  endDate: timestamp('end_date').notNull(),
  initialBalance: integer('initial_balance').notNull(),
  personalStartingBalance: integer('personal_starting_balance').notNull().default(0),
  status: competitionStatusEnum('status').default('active').notNull(),
  // Null programmeId/classId keeps standalone competitions working unchanged.
  // Round 2 (the master final) has a programmeId but no classId.
  programmeId: integer('programme_id').references(() => programmes.id),
  classId: integer('class_id').references(() => classes.id),
  round: integer('round').notNull().default(1),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const groups = pgTable('groups', {
  id: serial('id').primaryKey(),
  competitionId: integer('competition_id').references(() => competitions.id).notNull(),
  name: text('name').notNull(),
  balance: integer('balance').notNull(),
  groupPassword: text('group_password').notNull().default(''),
  groupPasswordHash: text('group_password_hash').notNull().default(''),
  teamId: integer('team_id').references(() => teams.id),
  // Per-group so capital can scale with headcount; P/L reads this, not the
  // competition-wide initialBalance.
  startingCapital: integer('starting_capital'),
  qualified: boolean('qualified').notNull().default(false),
  qualifiedRank: integer('qualified_rank'),
  kind: groupKindEnum('kind').notNull().default('team'),
})

export const students = pgTable('students', {
  id: serial('id').primaryKey(),
  groupId: integer('group_id').references(() => groups.id).notNull(),
  loginCode: text('login_code').notNull(),
  passwordHash: text('password_hash').notNull(),
  personalBalance: integer('personal_balance').notNull().default(0),
  participantId: integer('participant_id').references(() => participants.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => [
  uniqueIndex('students_group_login_code_idx').on(t.groupId, t.loginCode),
])

export const listings = pgTable('listings', {
  id: serial('id').primaryKey(),
  groupId: integer('group_id').references(() => groups.id).notNull(),
  createdBy: integer('created_by').references(() => students.id).notNull(),
  name: text('name').notNull(),
  description: text('description'),
  price: integer('price').notNull(),
  quantity: integer('quantity').notNull(),
  status: listingStatusEnum('status').default('pending').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const competitionOrganizers = pgTable('competition_organizers', {
  id: serial('id').primaryKey(),
  competitionId: integer('competition_id').references(() => competitions.id).notNull(),
  teacherId: integer('teacher_id').references(() => teachers.id).notNull(),
})

export const transfers = pgTable('transfers', {
  id: serial('id').primaryKey(),
  fromGroupId: integer('from_group_id').references(() => groups.id).notNull(),
  toGroupId: integer('to_group_id').references(() => groups.id),
  toStore: boolean('to_store').notNull().default(false),
  fromPersonal: boolean('from_personal').notNull().default(false),
  sentByStudentId: integer('sent_by_student_id').references(() => students.id).notNull(),
  amount: integer('amount').notNull(),
  message: text('message'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const transactions = pgTable('transactions', {
  id: serial('id').primaryKey(),
  listingId: integer('listing_id').references(() => listings.id).notNull(),
  buyerStudentId: integer('buyer_student_id').references(() => students.id).notNull(),
  buyerGroupId: integer('buyer_group_id').references(() => groups.id).notNull(),
  sellerGroupId: integer('seller_group_id').references(() => groups.id).notNull(),
  amount: integer('amount').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})
