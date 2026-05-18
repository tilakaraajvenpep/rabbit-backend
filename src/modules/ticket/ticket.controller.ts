import { Request, Response, NextFunction } from 'express';
import { TicketService } from './ticket.service.js';
import { success, error } from '../../utils/response.js';
import { createTicketSchema, updateTicketStatusSchema, assignTicketSchema } from './ticket.schema.js';

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
          clientName: 'Internal',
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

export const assignTicket = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    const id = parseInt(req.params.id);
    const { assignedToUserId } = assignTicketSchema.parse(req.body);

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
