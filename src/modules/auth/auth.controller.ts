import { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service.js';
import { TenantService } from '../tenant/tenant.service.js';
import { success } from '../../utils/response.js';
import { loginSchema, refreshSchema } from './auth.schema.js';

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, tenantCode } = loginSchema.parse(req.body);
    
    const tenant = await TenantService.resolveTenant(tenantCode);
    const result = await AuthService.login({ email, password, tenantId: tenant.tenantId });
    
    return success(res, result, 'Login successful');
  } catch (err) {
    next(err);
  }
};

export const refresh = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = refreshSchema.parse(req.body);
    const result = await AuthService.refresh({ refreshToken });
    return success(res, result, 'Token refreshed');
  } catch (err) {
    next(err);
  }
};

export const logout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user.userId;
    await AuthService.logout(userId);
    return success(res, null, 'Logged out');
  } catch (err) {
    next(err);
  }
};

export const me = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    return success(res, user, 'Current user profile');
  } catch (err) {
    next(err);
  }
};
