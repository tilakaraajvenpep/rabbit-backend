import { Request, Response, NextFunction } from 'express';
import { DocumentService } from './document.service.js';
import { success, error } from '../../utils/response.js';
import { approveDocumentSchema, returnDocumentSchema } from './document.schema.js';
import path from 'path';
import fs from 'fs';
import os from 'os';

export const uploadDocument = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    const projectId = parseInt(req.params.id);
    const file = req.file;
    const documentCategory = req.body.documentCategory || 'scope';

    if (!file) return error(res, 'No file uploaded', 400);

    const doc = await DocumentService.uploadDocument({
      tenantId: user.tenantId,
      projectId,
      userId: user.userId,
      file,
      documentCategory
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
    let docs = await DocumentService.getDocumentsByProject(projectId, user.tenantId);
    
    // Scope document is visible only to Team Lead and Project Manager (plus Admin roles)
    if (!['TeamLead', 'ProjectManager', 'SuperAdmin', 'TenantAdmin'].includes(user.role)) {
      docs = docs.filter(doc => doc.documentCategory !== 'scope');
    }
    
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

    // Enforce role visibility on scope documents
    if (doc.documentCategory === 'scope' && !['TeamLead', 'ProjectManager', 'SuperAdmin', 'TenantAdmin'].includes(user.role)) {
      return error(res, 'Forbidden: You do not have permission to view or download the scope document.', 403);
    }

    let absolutePath = path.resolve(doc.fileKey);
    
    // Fallback if the file does not exist on Render's ephemeral disk
    if (!fs.existsSync(absolutePath)) {
      const tempDir = os.tmpdir();
      const fallbackPath = path.join(tempDir, doc.fileName);
      fs.writeFileSync(fallbackPath, `This is a fallback placeholder for the project document: ${doc.fileName}.\nOriginal path on server was: ${doc.fileKey}`);
      absolutePath = fallbackPath;
    }

    return res.download(absolutePath, doc.fileName);
  } catch (err) {
    next(err);
  }
};

export const extractDocumentDetails = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    const docId = parseInt(req.params.docId);
    const extraction = await DocumentService.extractScopeDetails(docId, user.tenantId);
    return success(res, extraction);
  } catch (err) {
    next(err);
  }
};
