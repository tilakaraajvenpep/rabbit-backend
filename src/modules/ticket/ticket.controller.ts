import { Request, Response, NextFunction } from 'express';
import { TicketService } from './ticket.service.js';
import { success, error } from '../../utils/response.js';
import { createTicketSchema, updateTicketStatusSchema, assignTicketSchema, updateTicketProgressSchema } from './ticket.schema.js';

export const createTicket = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    const projectIdStr = req.params.id;
    let projectId = parseInt(projectIdStr);
    
    // If it's not a number, the user manually typed a project name
    if (isNaN(projectId)) {
      const projectName = decodeURIComponent(projectIdStr);
      // Try to find the project by name, or create a simple one
      const { db } = await import('../../db/index.js');
      const { projects } = await import('../../db/schema/index.js');
      const { eq, and } = await import('drizzle-orm');
      const { generateCode } = await import('../../utils/codeGenerator.js');

      let existingProject = await db.query.projects.findFirst({
        where: and(eq(projects.projectName, projectName), eq(projects.tenantId, user.tenantId))
      });

      if (!existingProject) {
        const projectCode = await generateCode('PRJ', user.tenantId);
        [existingProject] = await db.insert(projects).values({
          tenantId: user.tenantId,
          projectName,
          projectCode,
          client: 'Internal',
          status: 'Adhoc',
          createdByUserId: user.userId
        }).returning();
      }
      projectId = existingProject.projectId;
    }

    const data = createTicketSchema.parse(req.body);

    const ticket = await TicketService.createTicket({
      tenantId: user.tenantId,
      projectId,
      userId: user.userId,
      data
    });

    return success(res, ticket, 'Ticket created', 201);
  } catch (err) {
    next(err);
  }
};

export const getTickets = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    const projectIdStr = req.params.id;
    const projectId = projectIdStr ? parseInt(projectIdStr) : undefined;
    
    const tickets = await TicketService.getTickets({
      tenantId: user.tenantId,
      projectId: isNaN(projectId as any) ? undefined : projectId,
      userId: user.userId,
      role: user.role
    });
    return success(res, tickets);
  } catch (err) {
    next(err);
  }
};

export const updateTicketStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    const id = parseInt(req.params.id);
    const { status } = updateTicketStatusSchema.parse(req.body);

    const ticket = await TicketService.updateTicketStatus(id, user.tenantId, user.userId, status);
    return success(res, ticket, 'Ticket status updated');
  } catch (err) {
    next(err);
  }
};

export const updateTicketProgress = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    const id = parseInt(req.params.id);
    const { progressState, statusNotes } = updateTicketProgressSchema.parse(req.body);

    const ticket = await TicketService.updateTicketProgress(id, user.tenantId, user.userId, progressState, statusNotes);
    return success(res, ticket, 'Ticket progress updated');
  } catch (err) {
    next(err);
  }
};

export const assignTicket = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    const id = parseInt(req.params.id);
    const bodyVal = req.body.assignedToUserId !== undefined ? req.body.assignedToUserId : req.body.userId;
    const assignedToUserId = bodyVal ? Number(bodyVal) : null;

    const ticket = await TicketService.assignTicket(id, user.tenantId, user.userId, assignedToUserId);
    return success(res, ticket, 'Ticket assigned');
  } catch (err) {
    next(err);
  }
};

export const deleteTicket = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    const id = parseInt(req.params.id);

    await TicketService.deleteTicket(id, user.tenantId, user.userId);
    return success(res, null, 'Ticket deleted');
  } catch (err) {
    next(err);
  }
};

export const updateTicket = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    const id = parseInt(req.params.id);
    const { title, description, priority, estimatedHours, dueDate, assignedToUserId } = req.body;

    const ticket = await TicketService.updateTicket(id, user.tenantId, user.userId, {
      title, description, priority, estimatedHours, dueDate, assignedToUserId
    });
    return success(res, ticket, 'Ticket updated');
  } catch (err) {
    next(err);
  }
};

export const cleanupTaskTickets = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    const { db } = await import('../../db/index.js');
    const { tickets } = await import('../../db/schema/index.js');
    const { like, eq, and } = await import('drizzle-orm');

    // Find all Task: prefixed tickets for this tenant that are not yet deleted
    const taskTickets = await db
      .select({ ticketId: tickets.ticketId, ticketCode: tickets.ticketCode, title: tickets.title })
      .from(tickets)
      .where(and(like(tickets.title, 'Task:%'), eq(tickets.isDeleted, false), eq(tickets.tenantId, user.tenantId)));

    if (taskTickets.length === 0) {
      return success(res, { deleted: 0, tickets: [] }, 'No Task: tickets found — database already clean');
    }

    // Soft-delete them all
    const deleted = await db
      .update(tickets)
      .set({ isDeleted: true, updatedAt: new Date() })
      .where(and(like(tickets.title, 'Task:%'), eq(tickets.isDeleted, false), eq(tickets.tenantId, user.tenantId)))
      .returning({ ticketId: tickets.ticketId, ticketCode: tickets.ticketCode, title: tickets.title });

    console.log(`🗑️  Cleanup: removed ${deleted.length} Task: ticket(s) for tenant ${user.tenantId}`);
    return success(res, { deleted: deleted.length, tickets: deleted }, `Removed ${deleted.length} Task: ticket(s)`);
  } catch (err) {
    next(err);
  }
};
