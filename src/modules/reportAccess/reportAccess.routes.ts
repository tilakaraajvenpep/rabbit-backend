import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware.js';
import { checkRole } from '../../middleware/role.middleware.js';
import {
  createRequest,
  getMyRequests,
  getPendingRequests,
  respondToRequest,
  checkAccess,
  forwardToPM,
  forwardToAccounts,
  getHistoryRequests
} from './reportAccess.controller.js';

const router = Router();

// Employee/TL creates a request to report for an out-of-week date
router.post('/', authenticate, checkRole(['Employee', 'TeamLead']), createRequest);

// Employee/TL fetches their own requests
router.get('/my', authenticate, checkRole(['Employee', 'TeamLead']), getMyRequests);

// Employee/TL checks if approved for a specific date
router.get('/check', authenticate, checkRole(['Employee', 'TeamLead']), checkAccess);

// HR/PM/TL/Accounts views pending requests (dynamically filtered by controller)
router.get('/pending', authenticate, checkRole(['HR', 'ProjectManager', 'TenantAdmin', 'SuperAdmin', 'TeamLead', 'Accounts']), getPendingRequests);

// Get historical logs of requests
router.get('/history', authenticate, checkRole(['HR', 'ProjectManager', 'TenantAdmin', 'SuperAdmin', 'TeamLead', 'Accounts']), getHistoryRequests);

// HR/PM/TL/Accounts approves or rejects a request
router.patch('/:id/respond', authenticate, checkRole(['HR', 'ProjectManager', 'TenantAdmin', 'SuperAdmin', 'TeamLead', 'Accounts']), respondToRequest);

// Forwarding steps in the linear pipeline
router.patch('/:id/forward-pm', authenticate, checkRole(['TeamLead']), forwardToPM);
router.patch('/:id/forward-accounts', authenticate, checkRole(['ProjectManager']), forwardToAccounts);

export default router;
