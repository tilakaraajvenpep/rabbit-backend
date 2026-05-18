import { z } from 'zod';

export const costPhaseSchema = z.object({
  phaseName: z.string().min(2),
  budgetAllocation: z.number().min(0),
  estimatedHours: z.number().min(0),
});

export const costAnalysisSchema = z.object({
  totalBudget: z.number().min(0),
  totalEstimatedHours: z.number().min(0),
  estimatedCompletionDate: z.string().optional(),
  phases: z.array(costPhaseSchema).min(1),
});
