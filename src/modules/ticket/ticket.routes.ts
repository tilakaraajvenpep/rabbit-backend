import { Router } from 'express';
import * as ticketController from './ticket.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { checkRole } from '../../middleware/role.middleware.js';

const router = Router({ mergeParams: true });

router.use(authenticate);

// When used under /projects/:id/tickets
router.get('/', ticketController.getTickets);
router.post('/', checkRole(['Employee', 'TeamLead', 'ProjectManager', 'TenantAdmin']), ticketController.createTicket);

// When used under /tickets/:id
router.put('/:id', checkRole(['TeamLead', 'ProjectManager', 'TenantAdmin']), ticketController.updateTicket);
router.put('/:id/status', ticketController.updateTicketStatus);
router.put('/:id/progress', ticketController.updateTicketProgress);
router.put('/:id/assign', checkRole(['TeamLead', 'ProjectManager', 'TenantAdmin']), ticketController.assignTicket);
router.delete('/:id', checkRole(['TeamLead', 'Employee', 'ProjectManager', 'SuperAdmin', 'TenantAdmin']), ticketController.deleteTicket);

export default router;
