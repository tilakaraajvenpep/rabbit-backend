import { pgTable, serial, varchar, integer, boolean, decimal, timestamp } from 'drizzle-orm/pg-core';

export const tenants = pgTable('tenants', {
  tenantId: serial('tenant_id').primaryKey(),
  tenantCode: varchar('tenant_code', { length: 50 }).unique().notNull(),
  tenantName: varchar('tenant_name', { length: 300 }).notNull(),
  plan: varchar('plan', { length: 50 }).default('Free'),
  isActive: boolean('is_active').default(true),
  maxUsers: integer('max_users').default(5),
  maxProjects: integer('max_projects').default(3),
  storageQuotaGb: decimal('storage_quota_gb').default('1'),
  customDomain: varchar('custom_domain', { length: 300 }),
  subscriptionExpiry: timestamp('subscription_expiry'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  isDeleted: boolean('is_deleted').default(false),
});
