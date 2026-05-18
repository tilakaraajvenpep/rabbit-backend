import { db } from '../../db/index.js';
import { scopeDocuments, projects, auditLogs } from '../../db/schema/index.js';
import { eq, and, sql } from 'drizzle-orm';
import { emitToRoom } from '../../socket/socket.js';

export class DocumentService {
  static async uploadDocument({ tenantId, projectId, userId, file }: any) {
    // Count existing docs for versioning
    const existingDocs = await db.select({ count: sql<number>`count(*)` })
      .from(scopeDocuments)
      .where(and(eq(scopeDocuments.projectId, projectId), eq(scopeDocuments.tenantId, tenantId)));
    
    const version = Number(existingDocs[0].count) + 1;

    const [doc] = await db.insert(scopeDocuments).values({
      tenantId,
      projectId,
      fileName: file.originalname,
      fileKey: file.path,
      fileType: file.mimetype,
      fileSize: file.size,
      version,
      status: 'Pending',
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
}
