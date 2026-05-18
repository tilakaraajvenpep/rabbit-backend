import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  tenantCode: z.string(),
});

export const refreshSchema = z.object({
  refreshToken: z.string(),
});
