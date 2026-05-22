import { pgTable, serial, varchar, text, integer, boolean, timestamp, index, date } from 'drizzle-orm/pg-core';
import { tenants } from './tenants.js';
import { users } from './users.js';

export const leaves = pgTable('leaves', {
  leaveId: serial('leave_id').primaryKey(),
  tenantId: integer('tenant_id').references(() => tenants.tenantId).notNull(),
  userId: integer('user_id').references(() => users.userId).notNull(),
  leaveDate: date('leave_date').notNull(),
  type: varchar('type', { length: 50 }).notNull(), // 'HalfDay' or 'FullDay'
  status: varchar('status', { length: 50 }).default('Pending').notNull(), // 'Pending', 'Approved', 'Rejected'
  reason: text('reason'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  isDeleted: boolean('is_deleted').default(false),
},
(table) => ({
  tenantIdx: index('leaves_tenant_idx').on(table.tenantId),
  userIdIdx: index('leaves_user_idx').on(table.userId),
  leaveDateIdx: index('leaves_date_idx').on(table.leaveDate),
}));
