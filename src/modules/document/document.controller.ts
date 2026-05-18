import { Request, Response, NextFunction } from 'express';
import { DocumentService } from './document.service.js';
import { success, error } from '../../utils/response.js';
import { approveDocumentSchema, returnDocumentSchema } from './document.schema.js';
import path from 'path';

export const uploadDocument = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    const projectId = parseInt(req.params.id);
    const file = req.file;

    if (!file) return error(res, 'No file uploaded', 400);

    const doc = await DocumentService.uploadDocument({
      tenantId: user.tenantId,
      projectId,
      userId: user.userId,
      file
    });

    return success(res, doc, 'Document uploaded', 201);
  } catch (err) {
    next(err);
  }
};

export const getDocuments = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    const projectId = parseInt(req.params.id);
    const docs = await DocumentService.getDocumentsByProject(projectId, user.tenantId);
    return success(res, docs);
  } catch (err) {
    next(err);
  }
};

export const approveDocument = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    const docId = parseInt(req.params.docId);
    const { comments } = approveDocumentSchema.parse(req.body);

    const doc = await DocumentService.approveDocument(docId, user.tenantId, user.userId, comments);
    return success(res, doc, 'Document approved');
  } catch (err) {
    next(err);
  }
};

export const returnDocument = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    const docId = parseInt(req.params.docId);
    const { comments } = returnDocumentSchema.parse(req.body);

    const doc = await DocumentService.returnDocument(docId, user.tenantId, user.userId, comments);
    return success(res, doc, 'Document returned for revision');
  } catch (err) {
    next(err);
  }
};

export const downloadDocument = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    const docId = parseInt(req.params.docId);
    const doc = await DocumentService.getDocumentById(docId, user.tenantId);

    if (!doc) return error(res, 'Document not found', 404);

    const absolutePath = path.resolve(doc.fileKey);
    return res.download(absolutePath, doc.fileName);
  } catch (err) {
    next(err);
  }
};
