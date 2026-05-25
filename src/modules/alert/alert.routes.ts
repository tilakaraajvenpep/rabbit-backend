import { Router } from 'express';
import * as alertController from './alert.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { checkRole } from '../../middleware/role.middleware.js';

const router = Router();

router.use(authenticate);

router.get('/', checkRole(['TeamLead', 'ProjectManager', 'TenantAdmin']), alertController.getAlerts);
router.post('/', checkRole(['TeamLead', 'ProjectManager', 'Employee']), alertController.createAlert);
router.put('/:id/acknowledge', checkRole(['ProjectManager', 'TenantAdmin']), alertController.acknowledgeAlert);

export default router;
