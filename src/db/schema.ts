import { pgTable, serial, text, integer, timestamp, pgEnum, numeric, uniqueIndex } from 'drizzle-orm/pg-core'

export const listingStatusEnum = pgEnum('listing_status', ['pending', 'approved', 'rejected'])
export const competitionStatusEnum = pgEnum('competition_status', ['active', 'ended'])

export const teachers = pgTable('teachers', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const competitions = pgTable('competitions', {
  id: serial('id').primaryKey(),
  teacherId: integer('teacher_id').references(() => teachers.id).notNull(),
  name: text('name').notNull(),
  startDate: timestamp('start_date').notNull(),
  endDate: timestamp('end_date').notNull(),
  initialBalance: integer('initial_balance').notNull(),
  status: competitionStatusEnum('status').default('active').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const groups = pgTable('groups', {
  id: serial('id').primaryKey(),
  competitionId: integer('competition_id').references(() => competitions.id).notNull(),
  name: text('name').notNull(),
  balance: integer('balance').notNull(),
  groupPassword: text('group_password').notNull().default(''),
  groupPasswordHash: text('group_password_hash').notNull().default(''),
})

export const students = pgTable('students', {
  id: serial('id').primaryKey(),
  groupId: integer('group_id').references(() => groups.id).notNull(),
  loginCode: text('login_code').notNull(),
  passwordHash: text('password_hash').notNull(),
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
  toGroupId: integer('to_group_id').references(() => groups.id).notNull(),
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
