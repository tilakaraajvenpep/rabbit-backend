import { z } from 'zod';

export const createProjectSchema = z.object({
  projectName: z.string().min(2),
  client: z.string().min(2),
  description: z.string().optional().nullable(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  budgetTable: z.any().optional(),
  milestones: z.any().optional(),
  status: z.enum(['Draft', 'PendingReview', 'ReturnedForRevision', 'Approved', 'InProgress', 'Completed', 'OnHold']).optional(),
});

export const updateProjectStatusSchema = z.object({
  status: z.enum(['Draft', 'PendingReview', 'ReturnedForRevision', 'Approved', 'InProgress', 'Completed', 'OnHold']),
  assignedTeamLeadId: z.number().int().positive().optional().nullable(),
  assignedProjectManagerId: z.number().int().positive().optional().nullable(),
  note: z.string().optional().nullable(),
  totalHours: z.any().optional(),
  bufferHours: z.any().optional(),
  budgetTable: z.any().optional(),
  milestones: z.any().optional(),
});
