import { z } from 'zod';

export const createTicketSchema = z.object({
  title: z.string().min(2),
  description: z.string().optional(),
  priority: z.enum(['Low', 'Medium', 'High', 'Urgent']).default('Medium'),
  assignedToUserId: z.number().optional(),
  estimatedHours: z.number().positive(),
});

export const updateTicketStatusSchema = z.object({
  status: z.enum(['ToDo', 'InProgress', 'InReview', 'Done']),
});

export const assignTicketSchema = z.object({
  assignedToUserId: z.number(),
});
