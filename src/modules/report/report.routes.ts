import { Router } from 'express';
import * as reportController from './report.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { checkRole } from '../../middleware/role.middleware.js';

const router = Router();

router.use(authenticate);

router.post('/daily', checkRole(['Employee', 'TeamLead']), reportController.submitReport);
router.get('/daily/me', checkRole(['Employee']), reportController.getMyReports);
router.get('/daily/me/range', checkRole(['Employee', 'TeamLead', 'ProjectManager']), reportController.getMyReportsRange);
router.get('/daily/all/range', checkRole(['TeamLead', 'ProjectManager']), reportController.getAllReportsRange);
router.get('/daily/today', checkRole(['TeamLead', 'ProjectManager']), reportController.getTodayReports);

export default router;
