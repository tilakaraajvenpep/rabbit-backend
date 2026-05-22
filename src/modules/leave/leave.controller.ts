import { Request, Response, NextFunction } from 'express';
import { LeaveService } from './leave.service.js';
import { success } from '../../utils/response.js';

export const applyLeave = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    const { leaveDate, fromDate, toDate, type, reason } = req.body;

    if (!leaveDate && (!fromDate || !toDate)) {
      return res.status(400).json({ status: 'error', message: 'Either leaveDate or both fromDate and toDate are required' });
    }

    if (!type) {
      return res.status(400).json({ status: 'error', message: 'type is required' });
    }

    const leave = await LeaveService.applyLeave({
      tenantId: user.tenantId,
      userId: user.userId,
      leaveDate,
      fromDate,
      toDate,
      type,
      reason
    });

    return success(res, leave, 'Leave request submitted successfully', 201);
  } catch (err) {
    next(err);
  }
};

export const getMyLeaves = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    const leaves = await LeaveService.getMyLeaves(user.userId, user.tenantId);
    return success(res, leaves);
  } catch (err) {
    next(err);
  }
};

export const getPendingLeaves = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    const leaves = await LeaveService.getPendingLeaves(user.tenantId);
    return success(res, leaves);
  } catch (err) {
    next(err);
  }
};

export const getAllLeaves = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    const leaves = await LeaveService.getAllLeaves(user.tenantId);
    return success(res, leaves);
  } catch (err) {
    next(err);
  }
};

export const updateLeaveStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    const leaveId = Number(req.params.id);
    const { status } = req.body;

    if (!status || !['Approved', 'Rejected'].includes(status)) {
      return res.status(400).json({ status: 'error', message: 'Valid status is required (Approved or Rejected)' });
    }

    const leave = await LeaveService.updateLeaveStatus(leaveId, user.tenantId, status);
    return success(res, leave, `Leave status updated to ${status}`);
  } catch (err) {
    next(err);
  }
};
