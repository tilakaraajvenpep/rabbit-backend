import { Router } from 'express';
import * as analyticsController from './analytics.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { checkRole } from '../../middleware/role.middleware.js';

const router = Router();

router.use(authenticate);

router.get('/dashboard', checkRole(['ProjectManager', 'SuperAdmin', 'TenantAdmin']), analyticsController.getDashboardSummary);
router.get('/projects/:id', checkRole(['ProjectManager', 'SuperAdmin', 'Sales', 'Accounts', 'TenantAdmin']), analyticsController.getProjectAnalytics);

export default router;
