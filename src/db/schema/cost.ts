import { pgTable, serial, varchar, text, integer, boolean, timestamp, index, decimal } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { projects } from './projects';

export const costAnalysis = pgTable('cost_analysis', {
  costAnalysisId: serial('cost_analysis_id').primaryKey(),
  tenantId: integer('tenant_id').references(() => tenants.tenantId).notNull(),
  projectId: integer('project_id').references(() => projects.projectId).notNull(),
  totalBudget: decimal('total_budget', { precision: 15, scale: 2 }).notNull(),
  totalEstimatedHours: decimal('total_estimated_hours', { precision: 10, scale: 2 }).notNull(),
  estimatedCompletionDate: timestamp('estimated_completion_date'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  isDeleted: boolean('is_deleted').default(false),
},
(table) => ({
  tenantIdx: index('cost_analysis_tenant_idx').on(table.tenantId),
  projectIdx: index('cost_analysis_project_idx').on(table.projectId),
}));

export const costPhases = pgTable('cost_phases', {
  phaseId: serial('phase_id').primaryKey(),
  tenantId: integer('tenant_id').references(() => tenants.tenantId).notNull(),
  costAnalysisId: integer('cost_analysis_id').references(() => costAnalysis.costAnalysisId).notNull(),
  phaseName: varchar('phase_name', { length: 200 }).notNull(),
  budgetAllocation: decimal('budget_allocation', { precision: 15, scale: 2 }).notNull(),
  estimatedHours: decimal('estimated_hours', { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  isDeleted: boolean('is_deleted').default(false),
},
(table) => ({
  tenantIdx: index('cost_phases_tenant_idx').on(table.tenantId),
}));
