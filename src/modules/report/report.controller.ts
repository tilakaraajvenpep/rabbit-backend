import { Request, Response, NextFunction } from 'express';
import { ReportService } from './report.service.js';
import { success } from '../../utils/response.js';
import { dailyReportSchema } from './report.schema.js';

export const submitReport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    const data = dailyReportSchema.parse(req.body);

    const report = await ReportService.submitDailyReport({
      tenantId: user.tenantId,
      userId: user.userId,
      data
    });

    return success(res, report, 'Daily report submitted', 201);
  } catch (err) {
    next(err);
  }
};

export const getMyReports = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    const { date } = req.query;

    if (date) {
      const report = await ReportService.getReportByDate(user.userId, user.tenantId, date as string);
      return success(res, report);
    }

    const reports = await ReportService.getMyReports(user.userId, user.tenantId);
    return success(res, reports);
  } catch (err) {
    next(err);
  }
};

export const getTodayReports = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    const reports = await ReportService.getTodayReports(user.tenantId);
    return success(res, reports);
  } catch (err) {
    next(err);
  }
};

export const getMyReportsRange = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    const { start, end } = req.query;
    const reports = await ReportService.getReportsByRange(user.userId, user.tenantId, start as string, end as string);
    return success(res, reports);
  } catch (err) {
    next(err);
  }
};

export const getAllReportsRange = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    const { start, end } = req.query;
    const reports = await ReportService.getAllReportsByRange(user.tenantId, start as string, end as string);
    return success(res, reports);
  } catch (err) {
    next(err);
  }
};
