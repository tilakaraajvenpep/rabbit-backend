import { z } from 'zod';

export const approveDocumentSchema = z.object({
  comments: z.string().optional(),
});

export const returnDocumentSchema = z.object({
  comments: z.string().min(5),
});
