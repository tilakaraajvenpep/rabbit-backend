import { pgTable, serial, varchar, text, integer, boolean, timestamp, date, index } from 'drizzle-orm/pg-core';
import { tenants } from './tenants.js';
import { users } from './users.js';

export const reportAccessRequests = pgTable('report_access_requests', {
  requestId: serial('request_id').primaryKey(),
  tenantId: integer('tenant_id').references(() => tenants.tenantId).notNull(),
  userId: integer('user_id').references(() => users.userId).notNull(),
  targetDate: date('target_date').notNull(),       // The specific date they want to report for
  reason: text('reason').notNull(),
  status: varchar('status', { length: 50 }).default('Pending').notNull(), // 'Pending' | 'Approved' | 'Rejected'
  reviewedByUserId: integer('reviewed_by_user_id').references(() => users.userId),
  reviewerComments: text('reviewer_comments'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  isDeleted: boolean('is_deleted').default(false),
},
(table) => ({
  tenantIdx: index('rar_tenant_idx').on(table.tenantId),
  userIdx: index('rar_user_idx').on(table.userId),
  dateIdx: index('rar_date_idx').on(table.targetDate),
}));
