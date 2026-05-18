import { Router } from 'express';
import * as auditController from './audit.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { checkRole } from '../../middleware/role.middleware.js';

const router = Router();

router.use(authenticate);

router.get('/', checkRole(['ProjectManager', 'SuperAdmin']), auditController.getLogs);

export default router;
