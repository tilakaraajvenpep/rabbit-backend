import { db } from '../../db/index.js';
import { tickets, auditLogs, projects } from '../../db/schema/index.js';
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
      whereClause = and(
        whereClause,
        or(
          eq(projects.assignedTeamLeadId, userId),
          eq(tickets.assignedToUserId, userId)
        )
      );
    }

    const results = await db.select({
      ticket: tickets,
      projectName: projects.projectName
    })
      .from(tickets)
      .leftJoin(projects, eq(tickets.projectId, projects.projectId))
      .where(whereClause)
      .orderBy(sql`${tickets.createdAt} DESC`);

    return results.map(r => ({
      ...r.ticket,
      projectName: r.projectName
    }));
  }


  static async getTicketsByProject(projectId: number, tenantId: number) {
    return await db.query.tickets.findMany({
      where: and(eq(tickets.projectId, projectId), eq(tickets.tenantId, tenantId), eq(tickets.isDeleted, false)),
      orderBy: (t, { asc }) => [asc(t.createdAt)],
    });
  }

  static async updateTicketStatus(ticketId: number, tenantId: number, userId: number, status: string) {
    const oldTicket = await db.query.tickets.findFirst({
      where: and(eq(tickets.ticketId, ticketId), eq(tickets.tenantId, tenantId)),
    });

    if (!oldTicket) throw new Error('Ticket not found');

    // Allow any valid status value - PM/TenantAdmin need full freedom on Kanban drag-drop
    const validStatuses = ['ToDo', 'InProgress', 'InReview', 'Done'];
    if (!validStatuses.includes(status)) {
      throw new Error(`Invalid status: ${status}`);
    }

    const [ticket] = await db.update(tickets)
      .set({ status, updatedAt: new Date() })
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

  static async assignTicket(ticketId: number, tenantId: number, userId: number, assignedToUserId: number) {
    const [ticket] = await db.update(tickets)
      .set({ assignedToUserId, updatedAt: new Date() })
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

    return ticket;
  }
}
