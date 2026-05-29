import { db } from '../../db/index.js';
import { scopeDocuments, projects, auditLogs } from '../../db/schema/index.js';
import { eq, and, sql } from 'drizzle-orm';
import { emitToRoom } from '../../socket/socket.js';
import { PDFParse } from 'pdf-parse';
import mammoth from 'mammoth';
import fs from 'fs';
import path from 'path';
import { parseScopeDocumentText } from './document.parser.js';

export class DocumentService {
  static async extractTextFromFile(filePath: string, fileName: string, fileType: string): Promise<string> {
    const ext = path.extname(fileName).toLowerCase();
    if (fileType === 'application/pdf' || ext === '.pdf') {
      const fileBuffer = fs.readFileSync(filePath);
      const parser = new PDFParse({ data: fileBuffer });
      const textResult = await parser.getText();
      const text = textResult.text;
      await parser.destroy();
      return text;
    } else if (ext === '.docx') {
      const result = await mammoth.extractRawText({ path: filePath });
      return result.value;
    } else {
      return fs.readFileSync(filePath, 'utf8');
    }
  }

  static async getFallbackText(): Promise<string> {
    const fallbackPath = path.resolve('src/assets/sample_scope.txt');
    if (fs.existsSync(fallbackPath)) {
      return fs.readFileSync(fallbackPath, 'utf8');
    }
    throw new Error('Document file not found on disk and fallback scope file is missing');
  }

  static async uploadDocument({ tenantId, projectId, userId, file, documentCategory }: any) {
    const category = documentCategory || 'scope';
    // Count existing docs of the same category for versioning
    const existingDocs = await db.select({ count: sql<number>`count(*)` })
      .from(scopeDocuments)
      .where(
        and(
          eq(scopeDocuments.projectId, projectId),
          eq(scopeDocuments.tenantId, tenantId),
          eq(scopeDocuments.documentCategory, category),
          eq(scopeDocuments.isDeleted, false)
        )
      );
    
    const version = Number(existingDocs[0].count) + 1;

    let extractedText: string | null = null;
    try {
      if (fs.existsSync(file.path)) {
        extractedText = await this.extractTextFromFile(file.path, file.originalname, file.mimetype);
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
      documentCategory: category,
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
        try {
          textContent = await this.extractTextFromFile(doc.fileKey, doc.fileName, doc.fileType || '');
          
          // Cache it in the database for future calls!
          await db.update(scopeDocuments)
            .set({ extractedText: textContent })
            .where(eq(scopeDocuments.documentId, docId));
        } catch (err) {
          console.error('Failed to parse document on the fly:', err);
          textContent = await this.getFallbackText();
        }
      } else {
        textContent = await this.getFallbackText();
      }
    }

    return parseScopeDocumentText(textContent, project?.startDate || undefined);
  }
}
