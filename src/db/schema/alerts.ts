import { pgTable, serial, varchar, text, integer, boolean, timestamp, index } from 'drizzle-orm/pg-core';
import { tenants } from './tenants.js';
import { projects } from './projects.js';

export const alerts = pgTable('alerts', {
  alertId: serial('alert_id').primaryKey(),
  tenantId: integer('tenant_id').references(() => tenants.tenantId).notNull(),
  projectId: integer('project_id').references(() => projects.projectId).notNull(),
  type: varchar('type', { length: 100 }).notNull(),
  severity: varchar('severity', { length: 50 }).notNull(),
  message: text('message').notNull(),
  isAcknowledged: boolean('is_acknowledged').default(false),
  acknowledgedAt: timestamp('acknowledged_at'),
  pmComment: text('pm_comment'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  isDeleted: boolean('is_deleted').default(false),
},
(table) => ({
  tenantIdx: index('alerts_tenant_idx').on(table.tenantId),
  projectIdx: index('alerts_project_idx').on(table.projectId),
}));
