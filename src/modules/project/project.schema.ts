import { z } from 'zod';

export const createProjectSchema = z.object({
  projectName: z.string().min(2),
  client: z.string().min(2),
  description: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export const updateProjectStatusSchema = z.object({
  status: z.enum(['Draft', 'PendingReview', 'ReturnedForRevision', 'Approved', 'InProgress', 'Completed', 'OnHold']),
});
