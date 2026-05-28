import { Router } from 'express';
import * as projectController from './project.controller.js';
import documentRoutes from '../document/document.routes.js';
import costRoutes from '../cost/cost.routes.js';
import ticketRoutes from '../ticket/ticket.routes.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { checkRole } from '../../middleware/role.middleware.js';

const router = Router();

router.use(authenticate);

router.get('/', checkRole(['Sales', 'Accounts', 'TeamLead', 'ProjectManager', 'SuperAdmin', 'TenantAdmin', 'Employee', 'HR']), projectController.getProjects);
router.post('/', checkRole(['Sales']), projectController.createProject);
router.get('/:id', projectController.getProjectById);
router.put('/:id', checkRole(['Sales']), projectController.updateProject);
router.put('/:id/status', checkRole(['Sales', 'Accounts', 'TeamLead', 'ProjectManager', 'TenantAdmin', 'HR']), projectController.updateProjectStatus);
router.put('/:id/:status', checkRole(['Sales', 'Accounts', 'TeamLead', 'ProjectManager', 'TenantAdmin', 'HR']), projectController.updateProjectStatus); // legacy mapping if any
router.delete('/:id', checkRole(['Sales', 'Accounts', 'TeamLead', 'ProjectManager', 'SuperAdmin', 'TenantAdmin']), projectController.deleteProject);

// Nested Routes
router.use('/:id/documents', documentRoutes);
router.use('/:id/cost-analysis', costRoutes);
router.use('/:id/tickets', ticketRoutes);

export default router;
