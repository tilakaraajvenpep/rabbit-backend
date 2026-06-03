import { z } from 'zod';

export const dailyReportItemSchema = z.object({
  ticketId: z.number().or(z.string().transform(v => parseInt(v))),
  hoursSpent: z.number().min(0.1),
  workDone: z.string().min(1),
});

export const dailyReportSchema = z.object({
  reportDate: z.string(), // YYYY-MM-DD
  items: z.array(dailyReportItemSchema),
});
