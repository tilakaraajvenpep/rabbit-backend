import { db } from '../../db/index.js';
import { timerRequests, tickets, users, projects } from '../../db/schema/index.js';
import { eq, and, or, inArray, sql } from 'drizzle-orm';
import { NotificationService } from '../notification/notification.service.js';

export class TimerRequestService {
  static async createRequest({ tenantId, userId, ticketId, requestType, requestedHours, reason, teamLeadId }: any) {
    const ticket = await db.query.tickets.findFirst({
      where: and(eq(tickets.ticketId, ticketId), eq(tickets.tenantId, tenantId)),
    });

    if (!ticket) throw new Error('Ticket not found');

    if (teamLeadId) {
      await db.update(users)
        .set({ teamLeadId: Number(teamLeadId), updatedAt: new Date() })
        .where(eq(users.userId, userId));
    }

    const employee = await db.query.users.findFirst({
      where: eq(users.userId, userId)
    });

    const initialStatus = employee?.role === 'TeamLead' ? 'PendingPM' : 'PendingTL';

    const [request] = await db.insert(timerRequests).values({
      tenantId,
      userId,
      ticketId,
      requestType,
      requestedHours: requestedHours ? String(requestedHours) : '0.00',
      reason,
      status: initialStatus,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();

    if (initialStatus === 'PendingPM') {
      const pms = await db.query.users.findMany({
        where: and(eq(users.tenantId, tenantId), eq(users.role, 'ProjectManager'))
      });
      for (const pm of pms) {
        await NotificationService.createNotification({
          tenantId,
          userId: pm.userId,
          title: `New Timer Request from Team Lead: ${employee?.fullName || 'Team Lead'}`,
          message: `Team Lead "${employee?.fullName}" requested permission for ticket "${ticket.title}" (${requestType}). Reason: ${reason}`,
          type: 'alert'
        });
      }
    } else {
      const activeTeamLeadId = teamLeadId ? Number(teamLeadId) : employee?.teamLeadId;
      if (activeTeamLeadId) {
        await NotificationService.createNotification({
          tenantId,
          userId: activeTeamLeadId,
          title: `New Timer Request: ${employee?.fullName || 'Employee'}`,
          message: `Employee "${employee?.fullName || 'Employee'}" requested permission for ticket "${ticket.title}" (${requestType}). Reason: ${reason}`,
          type: 'alert'
        });
      }
    }

    return request;
  }

  static async getEmployeeRequests(tenantId: number, userId: number) {
    return await db.select({
      request: timerRequests,
      ticketTitle: tickets.title,
      ticketCode: tickets.ticketCode,
    })
      .from(timerRequests)
      .leftJoin(tickets, eq(timerRequests.ticketId, tickets.ticketId))
      .where(and(eq(timerRequests.tenantId, tenantId), eq(timerRequests.userId, userId)))
      .orderBy(sql`${timerRequests.createdAt} DESC`);
  }

  static async getTLPendingRequests(tenantId: number, tlUserId: number) {
    // Find all employees whose team lead is tlUserId
    const employees = await db.query.users.findMany({
      where: and(eq(users.teamLeadId, tlUserId), eq(users.role, 'Employee')),
    });
    const employeeIds = employees.map(e => e.userId);

    if (employeeIds.length === 0) return [];

    return await db.select({
      request: timerRequests,
      employeeName: users.fullName,
      ticketTitle: tickets.title,
      ticketCode: tickets.ticketCode,
    })
      .from(timerRequests)
      .leftJoin(users, eq(timerRequests.userId, users.userId))
      .leftJoin(tickets, eq(timerRequests.ticketId, tickets.ticketId))
      .where(and(
        eq(timerRequests.tenantId, tenantId),
        eq(timerRequests.status, 'PendingTL'),
        inArray(timerRequests.userId, employeeIds)
      ))
      .orderBy(sql`${timerRequests.createdAt} DESC`);
  }

  static async getPMPendingRequests(tenantId: number) {
    return await db.select({
      request: timerRequests,
      employeeName: users.fullName,
      ticketTitle: tickets.title,
      ticketCode: tickets.ticketCode,
    })
      .from(timerRequests)
      .leftJoin(users, eq(timerRequests.userId, users.userId))
      .leftJoin(tickets, eq(timerRequests.ticketId, tickets.ticketId))
      .where(and(
        eq(timerRequests.tenantId, tenantId),
        eq(timerRequests.status, 'PendingPM')
      ))
      .orderBy(sql`${timerRequests.createdAt} DESC`);
  }

  static async forwardToPM(requestId: number, tenantId: number, tlUserId: number, comments?: string) {
    const oldRequest = await db.query.timerRequests.findFirst({
      where: and(eq(timerRequests.requestId, requestId), eq(timerRequests.tenantId, tenantId)),
    });

    if (!oldRequest) throw new Error('Request not found');

    const [request] = await db.update(timerRequests)
      .set({
        status: 'PendingPM',
        comments: comments || oldRequest.comments,
        updatedAt: new Date()
      })
      .where(and(eq(timerRequests.requestId, requestId), eq(timerRequests.tenantId, tenantId)))
      .returning();

    // Notify Project Managers under this tenant
    const pms = await db.query.users.findMany({
      where: and(eq(users.tenantId, tenantId), eq(users.role, 'ProjectManager'))
    });

    const employee = await db.query.users.findFirst({
      where: eq(users.userId, request.userId)
    });

    for (const pm of pms) {
      await NotificationService.createNotification({
        tenantId,
        userId: pm.userId,
        title: `Timer Request Forwarded: ${employee?.fullName}`,
        message: `Team Lead forwarded a timer request for "${employee?.fullName}" on ticket "${request.ticketId}". Status: Pending PM review.`,
        type: 'alert'
      });
    }

    return request;
  }

  static async respondToRequest(requestId: number, tenantId: number, pmUserId: number, approved: boolean, comments?: string) {
    const oldRequest = await db.query.timerRequests.findFirst({
      where: and(eq(timerRequests.requestId, requestId), eq(timerRequests.tenantId, tenantId)),
    });

    if (!oldRequest) throw new Error('Request not found');

    const status = approved ? 'Approved' : 'Rejected';

    const [request] = await db.update(timerRequests)
      .set({
        status,
        comments,
        updatedAt: new Date()
      })
      .where(and(eq(timerRequests.requestId, requestId), eq(timerRequests.tenantId, tenantId)))
      .returning();

    // If approved and request type is 'TimerMissed', we can directly add a default of 4 hours (14400 seconds) 
    // or let them report. The requirement says:
    // "once project manager approves, directly send the response to the employee and then they can report for the same ticket by adding under another task"
    if (approved) {
      // We can directly add some credit to the ticket's timerAccumulatedSeconds so they are allowed to report!
      const ticket = await db.query.tickets.findFirst({
        where: eq(tickets.ticketId, request.ticketId)
      });
      if (ticket) {
        const addedSeconds = Math.max(1, parseFloat(request.requestedHours || '0')) * 3600;
        await db.update(tickets)
          .set({
            timerAccumulatedSeconds: (ticket.timerAccumulatedSeconds || 0) + addedSeconds
          })
          .where(eq(tickets.ticketId, ticket.ticketId));
      }
    }

    // Notify employee directly
    await NotificationService.createNotification({
      tenantId,
      userId: request.userId,
      title: `Timer Request ${status}`,
      message: `Your request for ticket ID "${request.ticketId}" has been ${status.toLowerCase()} by Project Manager. Comments: ${comments || 'None'}`,
      type: 'ticket'
    });

    return request;
  }
}
