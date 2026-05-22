import { z } from 'zod';

export const createTicketSchema = z.object({
  title: z.string().min(2),
  description: z.string().optional(),
  priority: z.enum(['Low', 'Medium', 'High', 'Critical']).default('Medium'),
  assignedToUserId: z.union([z.number(), z.string()]).optional().transform(val => {
    if (typeof val === 'string') {
      return val ? parseInt(val, 10) : undefined;
    }
    return val;
  }),
  estimatedHours: z.number().positive(),
  dueDate: z.string().optional().nullable(),
  milestone: z.string().max(200).optional().nullable(),
});

export const updateTicketStatusSchema = z.object({
  status: z.enum(['ToDo', 'InProgress', 'InReview', 'Done']),
});

export const assignTicketSchema = z.object({
  assignedToUserId: z.number(),
});

export const updateTicketProgressSchema = z.object({
  progressState: z.string(),
  statusNotes: z.string().optional(),
});
