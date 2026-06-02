import { z } from 'zod';

export const createTicketSchema = z.object({
  title: z.string().min(2),
  description: z.string().optional(),
  priority: z.preprocess((val) => val === 'Urgent' ? 'Critical' : val, z.enum(['Low', 'Medium', 'High', 'Critical']).default('Medium')),
  assignedToUserId: z.union([z.number(), z.string()]).optional().nullable().transform(val => {
    if (val === null || val === undefined) return undefined;
    if (typeof val === 'string') {
      return val ? parseInt(val, 10) : undefined;
    }
    return val;
  }),
  estimatedHours: z.coerce.number().nonnegative(),
  startDate: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
  milestone: z.string().max(200).optional().nullable(),
  assignedEmployees: z.any().optional(),
});

export const updateTicketStatusSchema = z.object({
  status: z.string().min(1),
});

export const assignTicketSchema = z.object({
  assignedToUserId: z.number(),
});

export const updateTicketProgressSchema = z.object({
  progressState: z.string(),
  statusNotes: z.string().optional(),
});
