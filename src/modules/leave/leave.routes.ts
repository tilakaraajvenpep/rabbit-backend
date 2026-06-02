import { Router } from 'express';
import * as leaveController from './leave.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { checkRole } from '../../middleware/role.middleware.js';

const router = Router();

router.use(authenticate);

// Personal leave routes
router.post('/', checkRole(['Employee', 'TeamLead', 'ProjectManager', 'HR', 'Accounts', 'Sales']), leaveController.applyLeave);
router.get('/me', checkRole(['Employee', 'TeamLead', 'ProjectManager', 'HR', 'Accounts', 'Sales']), leaveController.getMyLeaves);
router.put('/:id', checkRole(['Employee', 'TeamLead', 'ProjectManager', 'HR', 'Accounts', 'Sales']), leaveController.updateLeave);
router.delete('/:id', checkRole(['Employee', 'TeamLead', 'ProjectManager', 'HR', 'Accounts', 'Sales']), leaveController.deleteLeave);

// PM / TL / Accounts routes
router.get('/pending', checkRole(['TeamLead', 'ProjectManager', 'TenantAdmin', 'Accounts']), leaveController.getPendingLeaves);
router.get('/all', checkRole(['TeamLead', 'ProjectManager', 'TenantAdmin', 'Accounts', 'HR']), leaveController.getAllLeaves);
router.put('/:id/status', checkRole(['TeamLead', 'ProjectManager', 'TenantAdmin', 'Accounts', 'HR']), leaveController.updateLeaveStatus);

export default router;
