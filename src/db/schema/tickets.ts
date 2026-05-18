import { pgTable, serial, varchar, text, integer, boolean, timestamp, index, decimal } from 'drizzle-orm/pg-core';
import { tenants } from './tenants.js';
import { projects } from './projects.js';
import { users } from './users.js';

export const tickets = pgTable('tickets', {
  ticketId: serial('ticket_id').primaryKey(),
  tenantId: integer('tenant_id').references(() => tenants.tenantId).notNull(),
  projectId: integer('project_id').references(() => projects.projectId).notNull(),
  ticketCode: varchar('ticket_code', { length: 50 }).notNull(),
  title: varchar('title', { length: 300 }).notNull(),
  description: text('description'),
  status: varchar('status', { length: 50 }).default('ToDo'),
  priority: varchar('priority', { length: 50 }).default('Medium'),
  assignedToUserId: integer('assigned_to_user_id').references(() => users.userId),
  estimatedHours: decimal('estimated_hours', { precision: 10, scale: 2 }).default('0.00'),
  progressState: varchar('progress_state', { length: 50 }).default('InProgress'),
  statusNotes: text('status_notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  isDeleted: boolean('is_deleted').default(false),
},
(table) => ({
  tenantIdx: index('tickets_tenant_idx').on(table.tenantId),
  projectIdx: index('tickets_project_idx').on(table.projectId),
}));
