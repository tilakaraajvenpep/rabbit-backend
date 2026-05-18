import { Request, Response, NextFunction } from 'express';
import { AuditService } from './audit.service.js';
import { success } from '../../utils/response.js';

export const getLogs = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    const logs = await AuditService.getLogs(user.tenantId);
    return success(res, logs);
  } catch (err) {
    next(err);
  }
};
