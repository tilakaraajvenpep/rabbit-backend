import { db } from '../../db/index.js';
import { tickets, auditLogs, projects, users } from '../../db/schema/index.js';
import { eq, and, sql, or } from 'drizzle-orm';
import { generateCode } from '../../utils/codeGenerator.js';
import { emitToRoom } from '../../socket/socket.js';
import { NotificationService } from '../notification/notification.service.js';

export class TicketService {
  static async createTicket({ tenantId, projectId, userId, data }: any) {
    const ticketCode = await generateCode('RBT', tenantId);

    // Validate project hours limit
    const project = await db.query.projects.findFirst({
      where: and(eq(projects.projectId, projectId), eq(projects.tenantId, tenantId)),
    });

    if (!project) throw new Error('Project not found');

    const totalEstimated = await db.select({ total: sql<number>`sum(estimated_hours)` })
      .from(tickets)
      .where(and(eq(tickets.projectId, projectId), eq(tickets.isDeleted, false)));
    
    const newTotal = Number(totalEstimated[0].total || 0) + data.estimatedHours;
    
    // Warning if exceeding project hours (but allow for now, or throw if strict)
    // if (newTotal > Number(project.approvedHours)) {
    //   throw new Error('Total ticket hours exceed project approved hours');
    // }

    const [ticket] = await db.insert(tickets).values({
      ...data,
      ticketCode,
      projectId,
      tenantId,
      status: 'ToDo',
      estimatedHours: String(data.estimatedHours),
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      milestone: data.milestone || null,
    }).returning();

    // Audit Log
    await db.insert(auditLogs).values({
      tenantId,
      userId,
      action: 'CREATE_TICKET',
      entityType: 'ticket',
      entityId: ticket.ticketId,
      newData: ticket,
    });

    emitToRoom(`project:${projectId}`, 'ticket-created', ticket);

    // Notify assigned user
    if (ticket.assignedToUserId) {
      try {
        const projectObj = await db.query.projects.findFirst({
          where: eq(projects.projectId, projectId)
        });
        
        await NotificationService.createNotification({
          tenantId,
          userId: ticket.assignedToUserId,
          title: `New Ticket Assigned: ${ticket.title} (${ticket.ticketCode})`,
          message: `You have been assigned to ticket "${ticket.title}" under project "${projectObj?.projectName || 'Default'}".`,
          type: 'ticket'
        });
      } catch (notifErr) {
        console.error('Failed to create ticket creation assignment notification:', notifErr);
      }
    }

    return ticket;
  }

  static async getTickets({ tenantId, projectId, userId, role }: any) {
    let whereClause = and(eq(tickets.tenantId, tenantId), eq(tickets.isDeleted, false));
    
    if (projectId) {
      whereClause = and(whereClause, eq(tickets.projectId, projectId));
    }

    if (role === 'Employee') {
      whereClause = and(whereClause, eq(tickets.assignedToUserId, userId));
    }

    if (role === 'TeamLead') {
      if (!projectId) {
        whereClause = and(
          whereClause,
          or(
            eq(projects.assignedTeamLeadId, userId),
            eq(tickets.assignedToUserId, userId)
          )
        );
      }
    }


    const results = await db.select({
      ticket: tickets,
      projectName: projects.projectName,
      consumedHours: sql<string>`COALESCE((SELECT SUM(hours_spent) FROM daily_report_items WHERE ticket_id = ${tickets.ticketId} AND is_deleted = false), 0.00)`
    })
      .from(tickets)
      .leftJoin(projects, eq(tickets.projectId, projects.projectId))
      .where(whereClause)
      .orderBy(sql`${tickets.createdAt} DESC`);

    return results.map(r => ({
      ...r.ticket,
      projectName: r.projectName,
      consumedHours: parseFloat(r.consumedHours || '0.00')
    }));
  }


  static async getTicketsByProject(projectId: number, tenantId: number) {
    const results = await db.select({
      ticket: tickets,
      consumedHours: sql<string>`COALESCE((SELECT SUM(hours_spent) FROM daily_report_items WHERE ticket_id = ${tickets.ticketId} AND is_deleted = false), 0.00)`
    })
      .from(tickets)
      .where(and(eq(tickets.projectId, projectId), eq(tickets.tenantId, tenantId), eq(tickets.isDeleted, false)))
      .orderBy(sql`${tickets.createdAt} ASC`);

    return results.map(r => ({
      ...r.ticket,
      consumedHours: parseFloat(r.consumedHours || '0.00')
    }));
  }


  static async updateTicketStatus(ticketId: number, tenantId: number, userId: number, status: string) {
    const oldTicket = await db.query.tickets.findFirst({
      where: and(eq(tickets.ticketId, ticketId), eq(tickets.tenantId, tenantId)),
    });

    if (!oldTicket) throw new Error('Ticket not found');

    // Allow any valid status value - dynamic check based on project configured Kanban columns
    let validStatuses = ['ToDo', 'InProgress', 'InReview', 'Done'];
    if (oldTicket.projectId) {
      const project = await db.query.projects.findFirst({
        where: eq(projects.projectId, oldTicket.projectId)
      });
      if (project && project.kanbanColumns) {
        let projectStatuses: string[] = [];
        if (Array.isArray(project.kanbanColumns)) {
          projectStatuses = project.kanbanColumns.map((col: any) => col.key);
        } else {
          projectStatuses = Object.keys(project.kanbanColumns);
        }
        validStatuses = Array.from(new Set([...validStatuses, ...projectStatuses]));
      }
    }

    if (!validStatuses.includes(status)) {
      throw new Error(`Invalid status: ${status}`);
    }

    const updateData: any = { status, updatedAt: new Date() };

    // Transition logic for Kanban Timer
    if (status === 'InProgress' && oldTicket.status !== 'InProgress') {
      updateData.timerStartedAt = new Date();
    } else if (status !== 'InProgress' && oldTicket.status === 'InProgress') {
      if (oldTicket.timerStartedAt) {
        const elapsed = Math.floor((new Date().getTime() - new Date(oldTicket.timerStartedAt).getTime()) / 1000);
        updateData.timerAccumulatedSeconds = (oldTicket.timerAccumulatedSeconds || 0) + elapsed;
      }
      updateData.timerStartedAt = null;
    }

    const [ticket] = await db.update(tickets)
      .set(updateData)
      .where(and(eq(tickets.ticketId, ticketId), eq(tickets.tenantId, tenantId)))
      .returning();


    // Audit Log
    await db.insert(auditLogs).values({
      tenantId,
      userId,
      action: 'UPDATE_TICKET_STATUS',
      entityType: 'ticket',
      entityId: ticket.ticketId,
      oldData: oldTicket,
      newData: ticket,
    });

    emitToRoom(`project:${ticket.projectId}`, 'ticket-status-updated', ticket);

    // Notify assigned user if status is updated by someone else
    if (ticket.assignedToUserId && ticket.assignedToUserId !== userId) {
      try {
        const updater = await db.query.users.findFirst({
          where: eq(users.userId, userId),
          columns: { fullName: true }
        });
        
        await NotificationService.createNotification({
          tenantId,
          userId: ticket.assignedToUserId,
          title: `Ticket Status Updated: ${ticket.ticketCode}`,
          message: `The status of your ticket "${ticket.title}" was updated to "${status}" by ${updater?.fullName || 'Manager'}.`,
          type: 'ticket'
        });
      } catch (notifErr) {
        console.error('Failed to create ticket status update notification:', notifErr);
      }
    }

    return ticket;
  }

  static async updateTicketProgress(ticketId: number, tenantId: number, userId: number, progressState: string, statusNotes?: string) {
    const oldTicket = await db.query.tickets.findFirst({
      where: and(eq(tickets.ticketId, ticketId), eq(tickets.tenantId, tenantId)),
    });

    if (!oldTicket) throw new Error('Ticket not found');

    const [ticket] = await db.update(tickets)
      .set({ progressState, statusNotes, updatedAt: new Date() })
      .where(and(eq(tickets.ticketId, ticketId), eq(tickets.tenantId, tenantId)))
      .returning();

    // Audit Log
    await db.insert(auditLogs).values({
      tenantId,
      userId,
      action: 'UPDATE_TICKET_PROGRESS',
      entityType: 'ticket',
      entityId: ticket.ticketId,
      oldData: oldTicket,
      newData: ticket,
    });

    emitToRoom(`project:${ticket.projectId}`, 'ticket-progress-updated', ticket);

    return ticket;
  }

  static async assignTicket(ticketId: number, tenantId: number, userId: number, assignedToUserId: number | null) {
    const [ticket] = await db.update(tickets)
      .set({ assignedToUserId: assignedToUserId as any, updatedAt: new Date() })
      .where(and(eq(tickets.ticketId, ticketId), eq(tickets.tenantId, tenantId)))
      .returning();

    emitToRoom(`project:${ticket.projectId}`, 'ticket-assigned', ticket);

    // Notify assigned user
    if (assignedToUserId) {
      try {
        const projectObj = await db.query.projects.findFirst({
          where: eq(projects.projectId, ticket.projectId)
        });
        
        await NotificationService.createNotification({
          tenantId,
          userId: assignedToUserId,
          title: `Ticket Assigned: ${ticket.title} (${ticket.ticketCode})`,
          message: `You have been assigned to ticket "${ticket.title}" under project "${projectObj?.projectName || 'Default'}".`,
          type: 'ticket'
        });
      } catch (notifErr) {
        console.error('Failed to create ticket assignment notification:', notifErr);
      }
    }

    return ticket;
  }

  static async deleteTicket(ticketId: number, tenantId: number, userId: number) {
    const [ticket] = await db.update(tickets)
      .set({ isDeleted: true, updatedAt: new Date() })
      .where(and(eq(tickets.ticketId, ticketId), eq(tickets.tenantId, tenantId)))
      .returning();

    emitToRoom(`project:${ticket.projectId}`, 'ticket-deleted', { ticketId });

    return { success: true };
  }

  static async updateTicket(ticketId: number, tenantId: number, userId: number, data: any) {
    const oldTicket = await db.query.tickets.findFirst({
      where: and(eq(tickets.ticketId, ticketId), eq(tickets.tenantId, tenantId)),
    });

    if (!oldTicket) throw new Error('Ticket not found');

    const updateData: any = { updatedAt: new Date() };
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.priority !== undefined) updateData.priority = data.priority;
    if (data.estimatedHours !== undefined) updateData.estimatedHours = String(data.estimatedHours);
    if (data.dueDate !== undefined) updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null;
    if (data.assignedToUserId !== undefined) updateData.assignedToUserId = data.assignedToUserId;

    const [ticket] = await db.update(tickets)
      .set(updateData)
      .where(and(eq(tickets.ticketId, ticketId), eq(tickets.tenantId, tenantId)))
      .returning();

    emitToRoom(`project:${ticket.projectId}`, 'ticket-updated', ticket);

    // Notify assigned user if assignee changed and is not null
    if (ticket.assignedToUserId && ticket.assignedToUserId !== oldTicket.assignedToUserId) {
      try {
        const projectObj = await db.query.projects.findFirst({
          where: eq(projects.projectId, ticket.projectId)
        });
        
        await NotificationService.createNotification({
          tenantId,
          userId: ticket.assignedToUserId,
          title: `Ticket Assigned: ${ticket.title} (${ticket.ticketCode})`,
          message: `You have been assigned to ticket "${ticket.title}" under project "${projectObj?.projectName || 'Default'}".`,
          type: 'ticket'
        });
      } catch (notifErr) {
        console.error('Failed to create ticket update assignment notification:', notifErr);
      }
    }

    return ticket;
  }
}
