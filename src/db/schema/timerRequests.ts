import { pgTable, serial, varchar, text, integer, timestamp, decimal, boolean, index } from 'drizzle-orm/pg-core';
import { tenants } from './tenants.js';
import { users } from './users.js';
import { tickets } from './tickets.js';

export const timerRequests = pgTable('timer_requests', {
  requestId: serial('request_id').primaryKey(),
  tenantId: integer('tenant_id').references(() => tenants.tenantId).notNull(),
  userId: integer('user_id').references(() => users.userId).notNull(),
  ticketId: integer('ticket_id').references(() => tickets.ticketId).notNull(),
  requestType: varchar('request_type', { length: 50 }).notNull(), // 'TimerMissed' | 'ExceededLimit'
  requestedHours: decimal('requested_hours', { precision: 5, scale: 2 }).default('0.00'),
  reason: text('reason').notNull(),
  status: varchar('status', { length: 50 }).default('PendingTL'), // 'PendingTL' | 'PendingPM' | 'Approved' | 'Rejected'
  comments: text('comments'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  isDeleted: boolean('is_deleted').default(false),
},
(table) => ({
  tenantIdx: index('timer_requests_tenant_idx').on(table.tenantId),
  userIdIdx: index('timer_requests_user_idx').on(table.userId),
  ticketIdx: index('timer_requests_ticket_idx').on(table.ticketId),
}));
