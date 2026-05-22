import { db } from '../../db/index.js';
import { projects, auditLogs, users } from '../../db/schema/index.js';
import { eq, and, or, inArray } from 'drizzle-orm';
import { generateCode } from '../../utils/codeGenerator.js';
import { emitToRoom } from '../../socket/socket.js';
import { NotificationService } from '../notification/notification.service.js';

export class ProjectService {
  static async createProject({ tenantId, userId, data }: any) {
    const projectCode = await generateCode('PRJ', tenantId);
    
    const [project] = await db.insert(projects).values({
      ...data,
      startDate: data.startDate ? new Date(data.startDate) : undefined,
      endDate: data.endDate ? new Date(data.endDate) : undefined,
      projectCode,
      tenantId,
      createdByUserId: userId,
      status: 'PendingReview',
    }).returning();

    // Audit Log
    await db.insert(auditLogs).values({
      tenantId,
      userId,
      action: 'CREATE_PROJECT',
      entityType: 'project',
      entityId: project.projectId,
      newData: project,
    });

    // Notify PMs of new project pending review
    try {
      const pms = await db.query.users.findMany({
        where: and(
          eq(users.tenantId, tenantId),
          eq(users.role, 'ProjectManager'),
          eq(users.isDeleted, false)
        )
      });
      for (const pm of pms) {
        await NotificationService.createNotification({
          tenantId,
          userId: pm.userId,
          title: `New Project Submitted: ${project.projectName}`,
          message: `Project "${project.projectName}" (${project.projectCode}) is pending review.`,
          type: 'project'
        });
      }
    } catch (notifErr) {
      console.error('Failed to create new project notification:', notifErr);
    }

    return project;
  }

  static async getProjects({ tenantId, userId, role }: any) {
    let baseWhere = and(eq(projects.tenantId, tenantId), eq(projects.isDeleted, false));
    
    let roleFilter;
    if (role === 'Sales') {
      roleFilter = eq(projects.createdByUserId, userId);
    } else if (role === 'Accounts') {
      roleFilter = inArray(projects.status, ['PendingReview', 'ReturnedForRevision', 'Approved']);
    } else if (role === 'TeamLead') {
      roleFilter = or(
        eq(projects.assignedTeamLeadId, userId),
        inArray(projects.status, ['Approved', 'InProgress'])
      );
    } else if (role === 'ProjectManager' || role === 'SuperAdmin') {
      roleFilter = undefined; // See all
    } else {
      // Employee might see projects they are assigned to via tickets? 
      // For now, let's say they can see all projects in their tenant or maybe none.
      // Usually, PM and TL manage projects.
      roleFilter = undefined;
    }

    const whereClause = roleFilter ? and(baseWhere, roleFilter) : baseWhere;

    const { users } = await import('../../db/schema/index.js');
    const results = await db.select({
      project: projects,
      teamLeadName: users.fullName
    })
    .from(projects)
    .leftJoin(users, eq(projects.assignedTeamLeadId, users.userId))
    .where(whereClause)
    .orderBy(projects.createdAt);

    // Drizzle reverse sort manually if desc is needed, or just use sql`... DESC`
    return results.reverse().map(r => ({
      ...r.project,
      teamLead: r.teamLeadName
    }));
  }

  static async getProjectById(projectId: number, tenantId: number) {
    return await db.query.projects.findFirst({
      where: and(eq(projects.projectId, projectId), eq(projects.tenantId, tenantId), eq(projects.isDeleted, false)),
    });
  }

  static async updateProjectStatus(projectId: number, tenantId: number, userId: number, status: string, assignedTeamLeadId?: number) {
    const oldProject = await this.getProjectById(projectId, tenantId);
    
    const updateData: any = { status, updatedAt: new Date() };
    if (assignedTeamLeadId !== undefined) {
      updateData.assignedTeamLeadId = assignedTeamLeadId;
    }

    const [project] = await db.update(projects)
      .set(updateData)
      .where(and(eq(projects.projectId, projectId), eq(projects.tenantId, tenantId)))
      .returning();

    // Audit Log
    await db.insert(auditLogs).values({
      tenantId,
      userId,
      action: 'UPDATE_PROJECT_STATUS',
      entityType: 'project',
      entityId: project.projectId,
      oldData: oldProject,
      newData: project,
    });

    // Notify
    emitToRoom(`project:${projectId}`, 'project-status-updated', project);

    // Notify Team Lead if assigned
    try {
      if (project.assignedTeamLeadId) {
        await NotificationService.createNotification({
          tenantId,
          userId: project.assignedTeamLeadId,
          title: `Project Assigned: ${project.projectName}`,
          message: `You have been assigned as Team Lead for project "${project.projectName}". Status: ${project.status}.`,
          type: 'project'
        });
      }

      // Notify project creator of status changes
      if (project.createdByUserId && project.createdByUserId !== userId) {
        await NotificationService.createNotification({
          tenantId,
          userId: project.createdByUserId,
          title: `Project Status Update: ${project.projectName}`,
          message: `The project "${project.projectName}" status has been updated to "${project.status}".`,
          type: 'project'
        });
      }
    } catch (notifErr) {
      console.error('Failed to create project update notifications:', notifErr);
    }

    return project;
  }

  static async deleteProject(projectId: number, tenantId: number, userId: number) {
    const { 
      projects, 
      tickets, 
      dailyReportItems, 
      costAnalysis, 
      costPhases, 
      scopeDocuments, 
      alerts,
      auditLogs 
    } = await import('../../db/schema/index.js');

    return await db.transaction(async (tx) => {
      // 1. Get the project details first for audit logging
      const project = await tx.query.projects.findFirst({
        where: and(eq(projects.projectId, projectId), eq(projects.tenantId, tenantId))
      });

      if (!project) {
        throw new Error('Project not found');
      }

      // 2. Find and delete related daily report items (tied to project's tickets)
      const projectTickets = await tx.select({ ticketId: tickets.ticketId })
        .from(tickets)
        .where(eq(tickets.projectId, projectId));
      
      const ticketIds = projectTickets.map(t => t.ticketId);
      if (ticketIds.length > 0) {
        await tx.delete(dailyReportItems).where(inArray(dailyReportItems.ticketId, ticketIds));
        // 3. Delete tickets
        await tx.delete(tickets).where(eq(tickets.projectId, projectId));
      } else {
        // Also ensure tickets matching are deleted (even if array is empty, run delete just in case)
        await tx.delete(tickets).where(eq(tickets.projectId, projectId));
      }

      // 4. Find and delete related cost phases
      const projectCostAnalyses = await tx.select({ costAnalysisId: costAnalysis.costAnalysisId })
        .from(costAnalysis)
        .where(eq(costAnalysis.projectId, projectId));
      
      const costAnalysisIds = projectCostAnalyses.map(ca => ca.costAnalysisId);
      if (costAnalysisIds.length > 0) {
        await tx.delete(costPhases).where(inArray(costPhases.costAnalysisId, costAnalysisIds));
        // 5. Delete cost analyses
        await tx.delete(costAnalysis).where(eq(costAnalysis.projectId, projectId));
      } else {
        await tx.delete(costAnalysis).where(eq(costAnalysis.projectId, projectId));
      }

      // 6. Delete scope documents
      await tx.delete(scopeDocuments).where(eq(scopeDocuments.projectId, projectId));

      // 7. Delete alerts
      await tx.delete(alerts).where(eq(alerts.projectId, projectId));

      // 8. Delete the project itself from the database (HARD DELETE)
      await tx.delete(projects).where(and(eq(projects.projectId, projectId), eq(projects.tenantId, tenantId)));

      // 9. Add an audit log entry
      await tx.insert(auditLogs).values({
        tenantId,
        userId,
        action: 'DELETE_PROJECT_HARD',
        entityType: 'project',
        entityId: projectId,
        oldData: project,
      });

      emitToRoom(`project:${projectId}`, 'project-deleted', { projectId });

      return { success: true };
    });
  }
}
