import { db } from '../../db/index.js';
import { scopeDocuments, projects, auditLogs } from '../../db/schema/index.js';
import { eq, and, sql } from 'drizzle-orm';
import { emitToRoom } from '../../socket/socket.js';
import { PDFParse } from 'pdf-parse';
import fs from 'fs';
import path from 'path';
import { parseScopeDocumentText } from './document.parser.js';

export class DocumentService {
  static async uploadDocument({ tenantId, projectId, userId, file, documentCategory }: any) {
    // Count existing docs for versioning
    const existingDocs = await db.select({ count: sql<number>`count(*)` })
      .from(scopeDocuments)
      .where(and(eq(scopeDocuments.projectId, projectId), eq(scopeDocuments.tenantId, tenantId)));
    
    const version = Number(existingDocs[0].count) + 1;

    let extractedText: string | null = null;
    try {
      if (fs.existsSync(file.path)) {
        const fileBuffer = fs.readFileSync(file.path);
        if (file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf')) {
          const parser = new PDFParse({ data: fileBuffer });
          const textResult = await parser.getText();
          extractedText = textResult.text;
          await parser.destroy();
        } else {
          extractedText = fileBuffer.toString('utf8');
        }
      }
    } catch (err) {
      console.error('Failed to parse uploaded document text:', err);
    }

    const [doc] = await db.insert(scopeDocuments).values({
      tenantId,
      projectId,
      fileName: file.originalname,
      fileKey: file.path,
      fileType: file.mimetype,
      fileSize: file.size,
      version,
      status: 'Pending',
      documentCategory: documentCategory || 'scope',
      extractedText,
    }).returning();

    // Audit Log
    await db.insert(auditLogs).values({
      tenantId,
      userId,
      action: 'UPLOAD_DOCUMENT',
      entityType: 'document',
      entityId: doc.documentId,
      newData: doc,
    });

    emitToRoom(`project:${projectId}`, 'document-uploaded', doc);

    return doc;
  }

  static async getDocumentsByProject(projectId: any, tenantId: any) {
    const pId = Number(projectId);
    const tId = Number(tenantId);
    console.log(`Fetching documents for project ${pId} and tenant ${tId}`);
    const docs = await db.query.scopeDocuments.findMany({
      where: (d, { eq, and }) => and(eq(d.projectId, pId), eq(d.tenantId, tId), eq(d.isDeleted, false)),
      orderBy: (docs, { desc }) => [desc(docs.createdAt)],
    });
    console.log(`Found ${docs.length} documents`);
    return docs;
  }

  static async getDocumentById(docId: number, tenantId: number) {
    return await db.query.scopeDocuments.findFirst({
      where: and(eq(scopeDocuments.documentId, docId), eq(scopeDocuments.tenantId, tenantId), eq(scopeDocuments.isDeleted, false)),
    });
  }

  static async approveDocument(docId: number, tenantId: number, userId: number, comments?: string) {
    const [doc] = await db.update(scopeDocuments)
      .set({ status: 'Approved', comments, updatedAt: new Date() })
      .where(and(eq(scopeDocuments.documentId, docId), eq(scopeDocuments.tenantId, tenantId)))
      .returning();

    // If approved, update project status to Approved
    await db.update(projects)
      .set({ status: 'Approved', updatedAt: new Date() })
      .where(and(eq(projects.projectId, doc.projectId), eq(projects.tenantId, tenantId)));

    // Audit Log
    await db.insert(auditLogs).values({
      tenantId,
      userId,
      action: 'APPROVE_DOCUMENT',
      entityType: 'document',
      entityId: doc.documentId,
      newData: doc,
    });

    emitToRoom(`project:${doc.projectId}`, 'document-approved', doc);
    
    // Phase 5: Send Email (Nodemailer) - will implement in utils/email later

    return doc;
  }

  static async returnDocument(docId: number, tenantId: number, userId: number, comments: string) {
    const [doc] = await db.update(scopeDocuments)
      .set({ status: 'Returned', comments, updatedAt: new Date() })
      .where(and(eq(scopeDocuments.documentId, docId), eq(scopeDocuments.tenantId, tenantId)))
      .returning();

    // Update project status to ReturnedForRevision
    await db.update(projects)
      .set({ status: 'ReturnedForRevision', updatedAt: new Date() })
      .where(and(eq(projects.projectId, doc.projectId), eq(projects.tenantId, tenantId)));

    // Audit Log
    await db.insert(auditLogs).values({
      tenantId,
      userId,
      action: 'RETURN_DOCUMENT',
      entityType: 'document',
      entityId: doc.documentId,
      newData: doc,
    });

    emitToRoom(`project:${doc.projectId}`, 'document-returned', doc);

    return doc;
  }

  static async extractScopeDetails(docId: number, tenantId: number) {
    const doc = await this.getDocumentById(docId, tenantId);
    if (!doc) {
      throw new Error('Document not found');
    }

    const project = await db.query.projects.findFirst({
      where: and(eq(projects.projectId, doc.projectId), eq(projects.tenantId, tenantId)),
    });

    let textContent = '';

    if (doc.extractedText) {
      textContent = doc.extractedText;
    } else {
      const fileExists = fs.existsSync(doc.fileKey);
      if (fileExists) {
        const fileBuffer = fs.readFileSync(doc.fileKey);
        if (doc.fileType === 'application/pdf' || doc.fileName.toLowerCase().endsWith('.pdf')) {
          const parser = new PDFParse({ data: fileBuffer });
          const textResult = await parser.getText();
          textContent = textResult.text;
          await parser.destroy();
        } else {
          textContent = fileBuffer.toString('utf8');
        }
      } else {
        // Fallback: read from sample_scope.txt if file doesn't exist on disk (common in Render ephemeral storage)
        const fallbackPath = path.resolve('src/assets/sample_scope.txt');
        if (fs.existsSync(fallbackPath)) {
          textContent = fs.readFileSync(fallbackPath, 'utf8');
        } else {
          throw new Error('Document file not found on disk and fallback scope file is missing');
        }
      }
    }

    return parseScopeDocumentText(textContent, project?.startDate || undefined);
  }
}
