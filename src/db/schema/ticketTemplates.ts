import { pgTable, serial, varchar, integer, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { tenants } from './tenants.js';

export const ticketTemplates = pgTable('ticket_templates', {
  templateId: serial('template_id').primaryKey(),
  tenantId: integer('tenant_id').references(() => tenants.tenantId).notNull(),
  templateName: varchar('template_name', { length: 255 }).notNull(),
  department: varchar('department', { length: 255 }),
  projectName: varchar('project_name', { length: 255 }),
  tickets: jsonb('tickets').notNull(), // Array of { title, description, priority, estimatedHours, milestone }
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
