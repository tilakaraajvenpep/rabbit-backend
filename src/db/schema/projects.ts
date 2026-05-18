import { pgTable, serial, varchar, text, integer, boolean, timestamp, index, decimal } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { users } from './users';

export const projects = pgTable('projects', {
  projectId: serial('project_id').primaryKey(),
  tenantId: integer('tenant_id').references(() => tenants.tenantId).notNull(),
  projectCode: varchar('project_code', { length: 50 }).notNull(),
  projectName: varchar('project_name', { length: 300 }).notNull(),
  client: varchar('client', { length: 300 }),
  description: text('description'),
  status: varchar('status', { length: 50 }).default('Draft'),
  createdByUserId: integer('created_by_user_id').references(() => users.userId),
  assignedTeamLeadId: integer('assigned_team_lead_id').references(() => users.userId),
  approvedBudget: decimal('approved_budget', { precision: 15, scale: 2 }).default('0.00'),
  approvedHours: decimal('approved_hours', { precision: 10, scale: 2 }).default('0.00'),
  startDate: timestamp('start_date'),
  endDate: timestamp('end_date'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  isDeleted: boolean('is_deleted').default(false),
},
(table) => ({
  tenantIdx: index('projects_tenant_idx').on(table.tenantId),
}));
