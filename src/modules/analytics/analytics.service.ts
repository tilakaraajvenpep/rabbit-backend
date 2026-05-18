import { db } from '../../db/index.js';
import { projects, alerts } from '../../db/schema/index.js';
import { eq, and, count, not } from 'drizzle-orm';

export class AnalyticsService {
  static async getDashboardSummary(tenantId: number) {
    // Total projects
    const totalProjectsRes = await db.select({ value: count() })
      .from(projects)
      .where(and(eq(projects.tenantId, tenantId), eq(projects.isDeleted, false)));
    
    // Active projects (InProgress)
    const activeProjectsRes = await db.select({ value: count() })
      .from(projects)
      .where(and(
        eq(projects.tenantId, tenantId), 
        eq(projects.status, 'InProgress'),
        eq(projects.isDeleted, false)
      ));
    
    // At risk (OnHold or explicitly marked - for now let's say OnHold)
    const atRiskProjectsRes = await db.select({ value: count() })
      .from(projects)
      .where(and(
        eq(projects.tenantId, tenantId), 
        eq(projects.status, 'OnHold'),
        eq(projects.isDeleted, false)
      ));
    
    // Unread alerts
    const unreadAlertsRes = await db.select({ value: count() })
      .from(alerts)
      .where(and(
        eq(alerts.tenantId, tenantId), 
        eq(alerts.isAcknowledged, false)
      ));

    return {
      totalProjects: Number(totalProjectsRes[0].value),
      activeProjects: Number(activeProjectsRes[0].value),
      atRiskProjects: Number(atRiskProjectsRes[0].value),
      unreadAlerts: Number(unreadAlertsRes[0].value),
      projectHealth: [
        { status: 'On Track', count: Number(activeProjectsRes[0].value), color: 'green' },
        { status: 'At Risk', count: Number(atRiskProjectsRes[0].value), color: 'amber' },
        { status: 'Delayed', count: 0, color: 'red' }
      ]
    };
  }

  static async getProjectAnalytics(projectId: number, tenantId: number) {
    const project = await db.query.projects.findFirst({
      where: (p, { eq, and }) => and(eq(p.projectId, projectId), eq(p.tenantId, tenantId))
    });

    if (!project) throw new Error('Project not found');

    // For now, return real project data combined with some mock trends for visualization
    return {
      projectName: project.projectName,
      projectCode: project.projectCode,
      employeeWork: [
        { name: 'Total Project', planned: project.totalEstimatedHours || 100, actual: project.consumedHours || 0 }
      ],
      timeline: [
        { date: new Date().toISOString().split('T')[0], planned: 10, actual: 5 }
      ],
      ticketStatus: [
        { name: 'Total', value: 10 }
      ],
      burnRate: [
        { date: new Date().toISOString().split('T')[0], cost: 1000 }
      ]
    };
  }
}
