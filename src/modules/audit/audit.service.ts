import { db } from '../../db/index.js';
import { auditLogs } from '../../db/schema/index.js';
import { eq, and } from 'drizzle-orm';

export class AuditService {
  static async getLogs(tenantId: number) {
    return await db.query.auditLogs.findMany({
      where: eq(auditLogs.tenantId, tenantId),
      orderBy: (a, { desc }) => [desc(a.createdAt)],
      limit: 100, // For now
    });
  }
}
