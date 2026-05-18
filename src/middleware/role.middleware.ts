import { Request, Response, NextFunction } from 'express';
import { error } from '../utils/response.js';

export const checkRole = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    if (!user) {
      return error(res, 'Unauthorized', 401);
    }

    if (!allowedRoles.includes(user.role)) {
      return error(res, 'Forbidden: Insufficient permissions', 403);
    }

    next();
  };
};
