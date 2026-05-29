import { Request, Response, NextFunction } from 'express';
import { AlertService } from './alert.service.js';
import { success } from '../../utils/response.js';
import { z } from 'zod';

export const getAlerts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    const alerts = await AlertService.getAlerts(user.tenantId);
    return success(res, alerts);
  } catch (err) {
    next(err);
  }
};

export const acknowledgeAlert = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    const id = parseInt(req.params.id);
    const { comment } = z.object({ comment: z.string() }).parse(req.body);

    const alert = await AlertService.acknowledgeAlert(id, user.tenantId, user.userId, comment);
    return success(res, alert, 'Alert acknowledged');
  } catch (err) {
    next(err);
  }
};

export const createAlert = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    const { type, severity, message, projectId } = req.body; // Add zod later if needed

    const alert = await AlertService.createAlert({
      tenantId: user.tenantId,
      projectId,
      type,
      severity,
      message,
      createdByUserId: user.userId
    });
    
    return success(res, alert, 'Alert raised successfully', 201);
  } catch (err) {
    next(err);
  }
};
