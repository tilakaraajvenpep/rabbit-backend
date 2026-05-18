import { Router } from 'express';
import * as tenantController from './tenant.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { checkRole } from '../../middleware/role.middleware.js';

const router = Router();

router.get('/resolve', tenantController.resolve); // Public

// Protected (SuperAdmin only)
router.get('/', authenticate, checkRole(['SuperAdmin']), tenantController.list);
router.get('/:id', authenticate, checkRole(['SuperAdmin']), tenantController.getById);
router.post('/', authenticate, checkRole(['SuperAdmin']), tenantController.create);
router.put('/:id', authenticate, checkRole(['SuperAdmin']), tenantController.update);
router.put('/:id/status', authenticate, checkRole(['SuperAdmin']), tenantController.updateStatus);

export default router;
