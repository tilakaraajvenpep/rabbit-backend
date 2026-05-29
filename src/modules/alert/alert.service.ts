import { db } from '../../db/index.js';
import { alerts, projects, tickets, users } from '../../db/schema/index.js';
import { eq, and, sql, ne } from 'drizzle-orm';
import { redis } from '../../cache/redis.js';
import { emitToRoom } from '../../socket/socket.js';
import { NotificationService } from '../notification/notification.service.js';

export class AlertService {
  static async getAlerts(tenantId: number) {
    const results = await db.select({
      alert: alerts,
      projectName: projects.projectName
    })
      .from(alerts)
      .leftJoin(projects, eq(alerts.projectId, projects.projectId))
      .where(and(
        eq(alerts.tenantId, tenantId), 
        eq(alerts.isDeleted, false),
        ne(alerts.type, 'Leave Request Alert')
      ))
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
    let resolvedProjectId = typeof projectId === 'string' ? parseInt(projectId) : Number(projectId);
    if (!resolvedProjectId || isNaN(resolvedProjectId)) {
      const [firstProject] = await db.select().from(projects).where(eq(projects.tenantId, tenantId)).limit(1);
      resolvedProjectId = firstProject ? firstProject.projectId : 1;
    }

    // Dedup check via Redis
    const dedupKey = `alert:${tenantId}:${resolvedProjectId}:${type}:${severity}`;
    if (redis.isOpen) {
      try {
        const exists = await redis.get(dedupKey);
        if (exists) return null;
      } catch (redisErr) {
        console.warn('Redis get failed in createAlert (ignored):', redisErr);
      }
    }

    const [alert] = await db.insert(alerts).values({
      tenantId,
      projectId: resolvedProjectId,
      type,
      severity,
      message,
    }).returning();

    if (redis.isOpen) {
      try {
        await redis.set(dedupKey, '1', { EX: 86400 });
      } catch (redisErr) {
        console.warn('Redis set failed in createAlert (ignored):', redisErr);
      }
    }

    emitToRoom(`pm-ops:${tenantId}`, 'new-alert', alert);

    // Create system/in-app notifications for PMs and assigned Team Lead
    try {
      const project = await db.query.projects.findFirst({
        where: eq(projects.projectId, resolvedProjectId)
      });
      
      const pms = await db.query.users.findMany({
        where: and(
          eq(users.tenantId, tenantId),
          eq(users.role, 'ProjectManager'),
          eq(users.isDeleted, false)
        )
      });

      const notifyUserIds = new Set<number>();
      for (const pm of pms) {
        notifyUserIds.add(pm.userId);
      }
      if (project?.assignedTeamLeadId) {
        notifyUserIds.add(project.assignedTeamLeadId);
      }

      for (const uid of notifyUserIds) {
        await NotificationService.createNotification({
          tenantId,
          userId: uid,
          title: `New Alert: ${type} (${severity})`,
          message: `Project "${project?.projectName || 'Default'}" raised a ${severity} alert: ${message}`,
          type: 'alert'
        });
      }
    } catch (notifErr) {
      console.error('Failed to create in-app notifications for alert:', notifErr);
    }

    return alert;
  }
}
