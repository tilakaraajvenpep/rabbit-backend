import { Request, Response, NextFunction } from 'express';
import { NotificationService } from './notification.service.js';
import { success } from '../../utils/response.js';

export const list = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    const notifications = await NotificationService.getNotifications(user.userId, user.tenantId);
    return success(res, notifications, 'Notifications retrieved successfully');
  } catch (err) {
    next(err);
  }
};

export const markAsRead = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    const notificationId = parseInt(req.params.id);
    const updated = await NotificationService.markAsRead(notificationId, user.userId, user.tenantId);
    
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }
    
    return success(res, updated, 'Notification marked as read');
  } catch (err) {
    next(err);
  }
};

export const markAllAsRead = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    const updated = await NotificationService.markAllAsRead(user.userId, user.tenantId);
    return success(res, updated, 'All notifications marked as read');
  } catch (err) {
    next(err);
  }
};
