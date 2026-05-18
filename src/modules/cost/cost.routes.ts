import { Router } from 'express';
import * as costController from './cost.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { checkRole } from '../../middleware/role.middleware.js';

const router = Router({ mergeParams: true });

router.use(authenticate);

router.post('/', checkRole(['Accounts']), costController.upsertCostAnalysis);
router.get('/', costController.getCostAnalysis);
router.put('/', checkRole(['Accounts']), costController.upsertCostAnalysis);

export default router;
