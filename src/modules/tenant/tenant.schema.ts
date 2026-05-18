import { z } from 'zod';

export const createTenantSchema = z.object({
  tenantCode: z.string().min(2),
  tenantName: z.string().min(2),
  plan: z.string().optional(),
  maxUsers: z.number().optional(),
  maxProjects: z.number().optional(),
});

export const updateTenantSchema = createTenantSchema.partial();

export const updateStatusSchema = z.object({
  isActive: z.boolean(),
});
