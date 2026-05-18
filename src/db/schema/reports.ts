import { pgTable, serial, varchar, text, integer, boolean, timestamp, index, decimal, date } from 'drizzle-orm/pg-core';
import { tenants } from './tenants.js';
import { users } from './users.js';
import { tickets } from './tickets.js';

export const dailyReports = pgTable('daily_reports', {
  reportId: serial('report_id').primaryKey(),
  tenantId: integer('tenant_id').references(() => tenants.tenantId).notNull(),
  userId: integer('user_id').references(() => users.userId).notNull(),
  reportDate: date('report_date').notNull(),
  totalHours: decimal('total_hours', { precision: 5, scale: 2 }).default('8.50'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  isDeleted: boolean('is_deleted').default(false),
},
(table) => ({
  tenantIdx: index('daily_reports_tenant_idx').on(table.tenantId),
  userIdIdx: index('daily_reports_user_idx').on(table.userId),
  reportDateIdx: index('daily_reports_date_idx').on(table.reportDate),
}));

export const dailyReportItems = pgTable('daily_report_items', {
  itemId: serial('item_id').primaryKey(),
  tenantId: integer('tenant_id').references(() => tenants.tenantId).notNull(),
  reportId: integer('report_id').references(() => dailyReports.reportId).notNull(),
  ticketId: integer('ticket_id').references(() => tickets.ticketId).notNull(),
  hoursSpent: decimal('hours_spent', { precision: 5, scale: 2 }).notNull(),
  workDone: text('work_done').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  isDeleted: boolean('is_deleted').default(false),
},
(table) => ({
  tenantIdx: index('daily_report_items_tenant_idx').on(table.tenantId),
  reportIdx: index('daily_report_items_report_idx').on(table.reportId),
}));
