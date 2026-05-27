import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware.js';
import { TimerRequestController } from './timerRequest.controller.js';

const router = Router();

router.use(authenticate);

router.post('/', TimerRequestController.createRequest);
router.get('/employee', TimerRequestController.getEmployeeRequests);
router.get('/tl', TimerRequestController.getTLPendingRequests);
router.get('/pm', TimerRequestController.getPMPendingRequests);
router.get('/accounts', TimerRequestController.getAccountsPendingRequests);
router.put('/:id/forward', TimerRequestController.forwardToPM);
router.put('/:id/forward-accounts', TimerRequestController.forwardToAccounts);
router.put('/:id/respond', TimerRequestController.respondToRequest);
router.put('/:id/accounts-respond', TimerRequestController.accountsRespondToRequest);

export default router;
