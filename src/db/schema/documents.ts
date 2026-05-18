import { pgTable, serial, varchar, text, integer, boolean, timestamp, index } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { projects } from './projects';

export const scopeDocuments = pgTable('scope_documents', {
  documentId: serial('document_id').primaryKey(),
  tenantId: integer('tenant_id').references(() => tenants.tenantId).notNull(),
  projectId: integer('project_id').references(() => projects.projectId).notNull(),
  fileName: varchar('file_name', { length: 500 }).notNull(),
  fileKey: varchar('file_key', { length: 500 }).notNull(),
  fileType: varchar('file_type', { length: 100 }),
  fileSize: integer('file_size'),
  version: integer('version').default(1),
  status: varchar('status', { length: 50 }).default('Pending'),
  comments: text('comments'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  isDeleted: boolean('is_deleted').default(false),
},
(table) => ({
  tenantIdx: index('documents_tenant_idx').on(table.tenantId),
  projectIdx: index('documents_project_idx').on(table.projectId),
}));
