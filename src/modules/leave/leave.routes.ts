import { Router } from 'express';
import * as leaveController from './leave.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { checkRole } from '../../middleware/role.middleware.js';

const router = Router();

router.use(authenticate);

// Employee routes
router.post('/', checkRole(['Employee']), leaveController.applyLeave);
router.get('/me', checkRole(['Employee']), leaveController.getMyLeaves);
router.put('/:id', checkRole(['Employee']), leaveController.updateLeave);
router.delete('/:id', checkRole(['Employee']), leaveController.deleteLeave);

// PM / TL routes
router.get('/pending', checkRole(['TeamLead', 'ProjectManager', 'TenantAdmin']), leaveController.getPendingLeaves);
router.get('/all', checkRole(['TeamLead', 'ProjectManager', 'TenantAdmin']), leaveController.getAllLeaves);
router.put('/:id/status', checkRole(['TeamLead', 'ProjectManager', 'TenantAdmin']), leaveController.updateLeaveStatus);

export default router;
