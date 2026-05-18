import { pgTable, serial, varchar, text, integer, timestamp, index, jsonb } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { users } from './users';

export const auditLogs = pgTable('audit_logs', {
  logId: serial('log_id').primaryKey(),
  tenantId: integer('tenant_id').references(() => tenants.tenantId).notNull(),
  userId: integer('user_id').references(() => users.userId),
  action: varchar('action', { length: 100 }).notNull(),
  entityType: varchar('entity_type', { length: 100 }).notNull(),
  entityId: integer('entity_id'),
  oldData: jsonb('old_data'),
  newData: jsonb('new_data'),
  ipAddress: varchar('ip_address', { length: 50 }),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at').defaultNow(),
},
(table) => ({
  tenantIdx: index('audit_logs_tenant_idx').on(table.tenantId),
  entityIdx: index('audit_logs_entity_idx').on(table.entityType, table.entityId),
}));
