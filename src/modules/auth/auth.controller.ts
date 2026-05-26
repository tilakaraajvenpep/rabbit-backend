import { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service.js';
import { TenantService } from '../tenant/tenant.service.js';
import { success } from '../../utils/response.js';
import { loginSchema, refreshSchema } from './auth.schema.js';

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.body) {
      return res.status(400).json({ message: 'Request body is missing' });
    }

    const parsed = loginSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        message: 'Validation error',
        errors: parsed.error.flatten(),
      });
    }

    const { email, password, tenantCode } = parsed.data;

    if (!tenantCode) {
      return res.status(400).json({ message: 'tenantCode is required' });
    }

    const tenant = await TenantService.resolveTenant(tenantCode);

    if (!tenant || !tenant.tenantId) {
      return res.status(400).json({ message: 'Invalid tenant code' });
    }

    const result = await AuthService.login({
      email,
      password,
      tenantId: tenant.tenantId,
    });

    return success(res, result, 'Login successful');
  } catch (err) {
    next(err);
  }
};

export const refresh = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.body) {
      return res.status(400).json({ message: 'Request body is missing' });
    }

    const parsed = refreshSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        message: 'Validation error',
        errors: parsed.error.flatten(),
      });
    }

    const result = await AuthService.refresh({
      refreshToken: parsed.data.refreshToken,
    });

    return success(res, result, 'Token refreshed');
  } catch (err) {
    next(err);
  }
};

export const logout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;

    if (!user?.userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    await AuthService.logout(user.userId);

    return success(res, null, 'Logged out');
  } catch (err) {
    next(err);
  }
};

export const me = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const jwtUser = (req as any).user;

    if (!jwtUser) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { db } = await import('../../db/index.js');
    const { users } = await import('../../db/schema/index.js');
    const { eq } = await import('drizzle-orm');

    const user = await db.query.users.findFirst({
      where: eq(users.userId, jwtUser.userId),
      columns: {
        userId: true, fullName: true, email: true, role: true,
        isActive: true, allocatedHours: true, tenantId: true, createdAt: true,
        teamLeadId: true,
      }
    });

    if (!user) return res.status(404).json({ message: 'User not found' });

    return success(res, user, 'Current user profile');
  } catch (err) {
    next(err);
  }
};