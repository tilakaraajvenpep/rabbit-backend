import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { checkRole } from '../../middleware/roleCheck.js';
import {
  createRequest,
  getMyRequests,
  getPendingRequests,
  respondToRequest,
  checkAccess
} from './reportAccess.controller.js';

const router = Router();

// Employee/TL creates a request to report for an out-of-week date
router.post('/', authenticate, checkRole(['Employee', 'TeamLead']), createRequest);

// Employee/TL fetches their own requests
router.get('/my', authenticate, checkRole(['Employee', 'TeamLead']), getMyRequests);

// Employee/TL checks if approved for a specific date
router.get('/check', authenticate, checkRole(['Employee', 'TeamLead']), checkAccess);

// HR/PM views all pending requests
router.get('/pending', authenticate, checkRole(['HR', 'ProjectManager', 'TenantAdmin', 'SuperAdmin']), getPendingRequests);

// HR/PM approves or rejects a request
router.patch('/:id/respond', authenticate, checkRole(['HR', 'ProjectManager', 'TenantAdmin', 'SuperAdmin']), respondToRequest);

export default router;
