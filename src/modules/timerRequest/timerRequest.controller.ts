import { Response } from 'express';
import { TimerRequestService } from './timerRequest.service.js';

export class TimerRequestController {
  static async createRequest(req: any, res: Response) {
    try {
      const { tenantId, userId } = req.user;
      const { ticketId, requestType, requestedHours, reason, teamLeadId } = req.body;
      if (!ticketId || !requestType || !reason) {
        return res.status(400).json({ message: 'Missing required fields' });
      }
      const request = await TimerRequestService.createRequest({
        tenantId, userId, ticketId, requestType, requestedHours, reason, teamLeadId,
      });
      return res.status(201).json({ data: request });
    } catch (err: any) {
      return res.status(500).json({ message: err.message || 'Server error' });
    }
  }

  static async getEmployeeRequests(req: any, res: Response) {
    try {
      const { tenantId, userId } = req.user;
      const requests = await TimerRequestService.getEmployeeRequests(tenantId, userId);
      return res.status(200).json({ data: requests });
    } catch (err: any) {
      return res.status(500).json({ message: err.message || 'Server error' });
    }
  }

  static async getTLPendingRequests(req: any, res: Response) {
    try {
      const { tenantId, userId } = req.user;
      const requests = await TimerRequestService.getTLPendingRequests(tenantId, userId);
      return res.status(200).json({ data: requests });
    } catch (err: any) {
      return res.status(500).json({ message: err.message || 'Server error' });
    }
  }

  static async getPMPendingRequests(req: any, res: Response) {
    try {
      const { tenantId } = req.user;
      const requests = await TimerRequestService.getPMPendingRequests(tenantId);
      return res.status(200).json({ data: requests });
    } catch (err: any) {
      return res.status(500).json({ message: err.message || 'Server error' });
    }
  }

  static async getAccountsPendingRequests(req: any, res: Response) {
    try {
      const { tenantId } = req.user;
      const requests = await TimerRequestService.getAccountsPendingRequests(tenantId);
      return res.status(200).json({ data: requests });
    } catch (err: any) {
      return res.status(500).json({ message: err.message || 'Server error' });
    }
  }

  static async forwardToPM(req: any, res: Response) {
    try {
      const { tenantId, userId } = req.user;
      const { id } = req.params;
      const { comments } = req.body;
      const request = await TimerRequestService.forwardToPM(Number(id), tenantId, userId, comments);
      return res.status(200).json({ data: request });
    } catch (err: any) {
      return res.status(500).json({ message: err.message || 'Server error' });
    }
  }

  static async forwardToAccounts(req: any, res: Response) {
    try {
      const { tenantId, userId } = req.user;
      const { id } = req.params;
      const { comments } = req.body;
      const request = await TimerRequestService.forwardToAccounts(Number(id), tenantId, userId, comments);
      return res.status(200).json({ data: request });
    } catch (err: any) {
      return res.status(500).json({ message: err.message || 'Server error' });
    }
  }

  static async respondToRequest(req: any, res: Response) {
    try {
      const { tenantId, userId } = req.user;
      const { id } = req.params;
      const { approved, comments } = req.body;
      if (approved === undefined) {
        return res.status(400).json({ message: 'approved status is required' });
      }
      const request = await TimerRequestService.respondToRequest(Number(id), tenantId, userId, approved, comments);
      return res.status(200).json({ data: request });
    } catch (err: any) {
      return res.status(500).json({ message: err.message || 'Server error' });
    }
  }

  static async accountsRespondToRequest(req: any, res: Response) {
    try {
      const { tenantId, userId } = req.user;
      const { id } = req.params;
      const { approved, comments } = req.body;
      if (approved === undefined) {
        return res.status(400).json({ message: 'approved status is required' });
      }
      const request = await TimerRequestService.accountsRespondToRequest(Number(id), tenantId, userId, approved, comments);
      return res.status(200).json({ data: request });
    } catch (err: any) {
      return res.status(500).json({ message: err.message || 'Server error' });
    }
  }

  static async getHRApprovedRequests(req: any, res: Response) {
    try {
      const { tenantId } = req.user;
      const requests = await TimerRequestService.getHRApprovedRequests(tenantId);
      return res.status(200).json({ data: requests });
    } catch (err: any) {
      return res.status(500).json({ message: err.message || 'Server error' });
    }
  }
}
