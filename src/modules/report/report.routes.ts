import { Router } from 'express';
import * as reportController from './report.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { checkRole } from '../../middleware/role.middleware.js';

const router = Router();

router.use(authenticate);

router.post('/daily', checkRole(['Employee', 'TeamLead', 'ProjectManager', 'TenantAdmin']), reportController.submitReport);
router.get('/daily/me', checkRole(['Employee', 'TeamLead', 'ProjectManager', 'TenantAdmin']), reportController.getMyReports);
router.get('/daily/me/range', checkRole(['Employee', 'TeamLead', 'ProjectManager', 'TenantAdmin']), reportController.getMyReportsRange);
router.get('/daily/all/range', checkRole(['Employee', 'TeamLead', 'ProjectManager', 'TenantAdmin', 'HR', 'Accounts', 'Sales']), reportController.getAllReportsRange);
router.get('/daily/today', checkRole(['TeamLead', 'ProjectManager', 'TenantAdmin']), reportController.getTodayReports);

export default router;
