import { Request, Response, NextFunction } from 'express';
import { ReportAccessService } from './reportAccess.service.js';
import { success } from '../../utils/response.js';

export const createRequest = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    const { targetDate, reason } = req.body;
    if (!targetDate) return res.status(400).json({ status: 'error', message: 'targetDate is required' });
    if (!reason) return res.status(400).json({ status: 'error', message: 'reason is required' });

    const result = await ReportAccessService.createRequest({
      tenantId: user.tenantId,
      userId: user.userId,
      targetDate,
      reason
    });
    return success(res, result, 'Report access request submitted', 201);
  } catch (err: any) {
    if (err.message?.includes('already')) return res.status(409).json({ status: 'error', message: err.message });
    next(err);
  }
};

export const getMyRequests = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    const data = await ReportAccessService.getMyRequests(user.tenantId, user.userId);
    return success(res, data);
  } catch (err) { next(err); }
};

export const getPendingRequests = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    let data;
    if (user.role === 'TeamLead') {
      data = await ReportAccessService.getTLPendingRequests(user.tenantId, user.userId);
    } else if (user.role === 'ProjectManager') {
      data = await ReportAccessService.getPMPendingRequests(user.tenantId);
    } else if (user.role === 'HR') {
      data = await ReportAccessService.getHRPendingRequests(user.tenantId);
    } else {
      data = await ReportAccessService.getPendingRequests(user.tenantId);
    }
    return success(res, data);
  } catch (err) { next(err); }
};

export const respondToRequest = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    const requestId = Number(req.params.id);
    const { approved, comments } = req.body;
    if (approved === undefined) return res.status(400).json({ status: 'error', message: 'approved field is required' });

    const result = await ReportAccessService.respondToRequest(requestId, user.tenantId, user.userId, !!approved, comments);
    return success(res, result, `Request ${approved ? 'approved' : 'rejected'} successfully`);
  } catch (err) { next(err); }
};

export const forwardToPM = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    const requestId = Number(req.params.id);
    const { comments } = req.body;
    const result = await ReportAccessService.forwardToPM(requestId, user.tenantId, comments);
    return success(res, result, 'Request forwarded to Project Manager successfully');
  } catch (err) { next(err); }
};

export const forwardToHR = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    const requestId = Number(req.params.id);
    const { comments } = req.body;
    const result = await ReportAccessService.forwardToHR(requestId, user.tenantId, comments);
    return success(res, result, 'Request forwarded to HR successfully');
  } catch (err) { next(err); }
};

export const checkAccess = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    const { date } = req.query;
    if (!date) return res.status(400).json({ status: 'error', message: 'date query param required' });
    const hasAccess = await ReportAccessService.checkAccess(user.tenantId, user.userId, String(date));
    return success(res, { hasAccess, date });
  } catch (err) { next(err); }
};

export const getHistoryRequests = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    const data = await ReportAccessService.getAllHistoryRequests(user.tenantId, user.userId, user.role);
    return success(res, data);
  } catch (err) { next(err); }
};
