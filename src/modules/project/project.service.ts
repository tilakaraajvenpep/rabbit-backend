import { db } from '../../db/index.js';
import { projects, auditLogs } from '../../db/schema/index.js';
import { eq, and, or, inArray } from 'drizzle-orm';
import { generateCode } from '../../utils/codeGenerator.js';
import { emitToRoom } from '../../socket/socket.js';

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

    return project;
  }

  static async deleteProject(projectId: number, tenantId: number, userId: number) {
    const [project] = await db.update(projects)
      .set({ isDeleted: true, updatedAt: new Date() })
      .where(and(eq(projects.projectId, projectId), eq(projects.tenantId, tenantId)))
      .returning();

    await db.insert(auditLogs).values({
      tenantId,
      userId,
      action: 'DELETE_PROJECT',
      entityType: 'project',
      entityId: projectId,
      oldData: project,
    });

    emitToRoom(`project:${projectId}`, 'project-deleted', { projectId });

    return { success: true };
  }
}
