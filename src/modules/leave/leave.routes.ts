import { Router } from 'express';
import * as leaveController from './leave.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { checkRole } from '../../middleware/role.middleware.js';

const router = Router();

router.use(authenticate);

// Employee routes
router.post('/', checkRole(['Employee']), leaveController.applyLeave);
router.get('/me', checkRole(['Employee']), leaveController.getMyLeaves);

// PM / TL routes
router.get('/pending', checkRole(['TeamLead', 'ProjectManager']), leaveController.getPendingLeaves);
router.get('/all', checkRole(['TeamLead', 'ProjectManager']), leaveController.getAllLeaves);
router.put('/:id/status', checkRole(['TeamLead', 'ProjectManager']), leaveController.updateLeaveStatus);

export default router;
