import { Request, Response, NextFunction } from 'express';
import { AnalyticsService } from './analytics.service.js';
import { success } from '../../utils/response.js';

export const getDashboardSummary = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    const summary = await AnalyticsService.getDashboardSummary(user.tenantId);
    return success(res, summary);
  } catch (err) {
    next(err);
  }
};

export const getProjectAnalytics = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    const id = parseInt(req.params.id);
    const stats = await AnalyticsService.getProjectAnalytics(id, user.tenantId);
    return success(res, stats);
  } catch (err) {
    next(err);
  }
};
