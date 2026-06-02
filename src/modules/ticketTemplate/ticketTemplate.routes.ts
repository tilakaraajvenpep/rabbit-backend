import { Router } from 'express';
import * as controller from './ticketTemplate.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { checkRole } from '../../middleware/role.middleware.js';

const router = Router();

router.use(authenticate);

router.post('/', checkRole(['ProjectManager', 'TenantAdmin']), controller.createTemplate);
router.get('/', checkRole(['ProjectManager', 'TenantAdmin', 'TeamLead']), controller.getTemplates);
router.delete('/:id', checkRole(['ProjectManager', 'TenantAdmin']), controller.deleteTemplate);

export default router;
