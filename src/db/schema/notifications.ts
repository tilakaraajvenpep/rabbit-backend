import { pgTable, serial, varchar, text, integer, boolean, timestamp, index } from 'drizzle-orm/pg-core';
import { tenants } from './tenants.js';
import { users } from './users.js';

export const notifications = pgTable('notifications', {
  notificationId: serial('notification_id').primaryKey(),
  tenantId: integer('tenant_id').references(() => tenants.tenantId).notNull(),
  userId: integer('user_id').references(() => users.userId).notNull(),
  title: varchar('title', { length: 300 }).notNull(),
  message: text('message').notNull(),
  type: varchar('type', { length: 50 }).notNull(), // 'alert', 'ticket', 'project', 'leave'
  isRead: boolean('is_read').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  isDeleted: boolean('is_deleted').default(false).notNull(),
},
(table) => ({
  tenantIdx: index('notifications_tenant_idx').on(table.tenantId),
  userIdIdx: index('notifications_user_idx').on(table.userId),
  isReadIdx: index('notifications_is_read_idx').on(table.isRead),
}));
