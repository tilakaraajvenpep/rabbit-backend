import { Router } from 'express';
import * as documentController from './document.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { checkRole } from '../../middleware/role.middleware.js';
import { upload } from '../../utils/fileUpload.js';

const router = Router({ mergeParams: true });

router.use(authenticate);

router.post('/', checkRole(['Sales']), upload.single('file'), documentController.uploadDocument);
router.get('/', documentController.getDocuments);
router.put('/:docId/approve', checkRole(['Accounts']), documentController.approveDocument);
router.put('/:docId/return', checkRole(['Accounts']), documentController.returnDocument);
router.get('/:docId/download', documentController.downloadDocument);
router.get('/:docId/extract', checkRole(['Accounts']), documentController.extractDocumentDetails);

export default router;
