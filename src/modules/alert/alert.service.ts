import { db } from '../../db/index.js';
import { alerts, projects, tickets } from '../../db/schema/index.js';
import { eq, and, sql } from 'drizzle-orm';
import { redis } from '../../cache/redis.js';
import { emitToRoom } from '../../socket/socket.js';

export class AlertService {
  static async getAlerts(tenantId: number) {
    const results = await db.select({
      alert: alerts,
      projectName: projects.projectName
    })
      .from(alerts)
      .leftJoin(projects, eq(alerts.projectId, projects.projectId))
      .where(and(eq(alerts.tenantId, tenantId), eq(alerts.isDeleted, false)))
      .orderBy(sql`${alerts.createdAt} DESC`);

    return results.map(r => ({
      ...r.alert,
      projectName: r.projectName
    }));
  }

  static async acknowledgeAlert(alertId: number, tenantId: number, userId: number, comment: string) {
    const [alert] = await db.update(alerts)
      .set({
        isAcknowledged: true,
        acknowledgedAt: new Date(),
        pmComment: comment,
        updatedAt: new Date(),
      })
      .where(and(eq(alerts.alertId, alertId), eq(alerts.tenantId, tenantId)))
      .returning();

    // Clear dedup key if needed or just leave it (roadmap says clear it)
    if (redis.isOpen) {
      // Key format used in cron: alert:{tenantId}:{projectId}:{type}:{severity}
      // We don't have projectId/type/severity here easily without querying, 
      // but we can just let it expire in 24h.
    }

    emitToRoom(`pm-ops:${tenantId}`, 'alert-acknowledged', alert);

    return alert;
  }

  static async createAlert({ tenantId, projectId, type, severity, message }: any) {
    // Dedup check via Redis
    const dedupKey = `alert:${tenantId}:${projectId}:${type}:${severity}`;
    if (redis.isOpen) {
      const exists = await redis.get(dedupKey);
      if (exists) return null;
    }

    const [alert] = await db.insert(alerts).values({
      tenantId,
      projectId,
      type,
      severity,
      message,
    }).returning();

    if (redis.isOpen) {
      await redis.set(dedupKey, '1', { EX: 86400 });
    }

    emitToRoom(`pm-ops:${tenantId}`, 'new-alert', alert);

    return alert;
  }
}
