import { pgTable, serial, varchar, text, integer, boolean, timestamp, unique, index, decimal } from 'drizzle-orm/pg-core';
import { tenants } from './tenants.js';

export const users = pgTable('users', {
  userId: serial('user_id').primaryKey(),
  tenantId: integer('tenant_id').references(() => tenants.tenantId).notNull(),
  fullName: varchar('full_name', { length: 200 }).notNull(),
  email: varchar('email', { length: 256 }).notNull(),
  passwordHash: text('password_hash').notNull(),
  role: varchar('role', { length: 50 }).notNull(),
  isActive: boolean('is_active').default(true),
  allocatedHours: decimal('allocated_hours', { precision: 6, scale: 2 }).default('0.00'),
  costPerHour: decimal('cost_per_hour', { precision: 10, scale: 2 }).default('0.00'),
  teamLeadId: integer('team_lead_id'),
  lastLoginAt: timestamp('last_login_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  isDeleted: boolean('is_deleted').default(false),
  dateOfJoining: varchar('date_of_joining', { length: 100 }),
},
(table) => ({
  tenantEmailUnique: unique().on(table.tenantId, table.email),
  tenantIdx: index('users_tenant_idx').on(table.tenantId),
}));
