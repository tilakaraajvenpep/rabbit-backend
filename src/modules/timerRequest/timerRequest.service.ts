import { db } from '../../db/index.js';
import { timerRequests, tickets, users } from '../../db/schema/index.js';
import { eq, and, inArray, sql } from 'drizzle-orm';
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

    const employee = await db.query.users.findFirst({ where: eq(users.userId, userId) });

    // All roles start at PendingTL — chain: TL → PM → Accounts → HR/PM reassigns quota
    const [request] = await db.insert(timerRequests).values({
      tenantId,
      userId,
      ticketId,
      requestType,
      requestedHours: requestedHours ? String(requestedHours) : '0.00',
      reason,
      status: 'PendingTL',
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();

    // Notify TL (or all PMs if no TL assigned)
    const activeTeamLeadId = teamLeadId ? Number(teamLeadId) : employee?.teamLeadId;
    if (activeTeamLeadId) {
      await NotificationService.createNotification({
        tenantId,
        userId: activeTeamLeadId,
        title: `Additional Hours Request: ${employee?.fullName || 'Employee'}`,
        message: `"${employee?.fullName || 'Employee'}" needs additional hours for ticket "${ticket.title}" (${requestType}). Reason: ${reason}`,
        type: 'alert',
      });
    } else {
      const pms = await db.query.users.findMany({
        where: and(eq(users.tenantId, tenantId), eq(users.role, 'ProjectManager')),
      });
      for (const pm of pms) {
        await NotificationService.createNotification({
          tenantId,
          userId: pm.userId,
          title: `Additional Hours Request: ${employee?.fullName || 'Employee'}`,
          message: `"${employee?.fullName || 'Employee'}" needs additional hours for ticket "${ticket.title}" (${requestType}). Reason: ${reason}`,
          type: 'alert',
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
    const employees = await db.query.users.findMany({
      where: and(eq(users.teamLeadId, tlUserId), eq(users.tenantId, tenantId)),
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
      .where(and(eq(timerRequests.tenantId, tenantId), eq(timerRequests.status, 'PendingPM')))
      .orderBy(sql`${timerRequests.createdAt} DESC`);
  }

  static async getAccountsPendingRequests(tenantId: number) {
    return await db.select({
      request: timerRequests,
      employeeName: users.fullName,
      ticketTitle: tickets.title,
      ticketCode: tickets.ticketCode,
    })
      .from(timerRequests)
      .leftJoin(users, eq(timerRequests.userId, users.userId))
      .leftJoin(tickets, eq(timerRequests.ticketId, tickets.ticketId))
      .where(and(eq(timerRequests.tenantId, tenantId), eq(timerRequests.status, 'PendingAccounts')))
      .orderBy(sql`${timerRequests.createdAt} DESC`);
  }

  // TL forwards to PM
  static async forwardToPM(requestId: number, tenantId: number, tlUserId: number, comments?: string) {
    const old = await db.query.timerRequests.findFirst({
      where: and(eq(timerRequests.requestId, requestId), eq(timerRequests.tenantId, tenantId)),
    });
    if (!old) throw new Error('Request not found');

    const [request] = await db.update(timerRequests)
      .set({ status: 'PendingPM', comments: comments || old.comments, updatedAt: new Date() })
      .where(and(eq(timerRequests.requestId, requestId), eq(timerRequests.tenantId, tenantId)))
      .returning();

    const pms = await db.query.users.findMany({
      where: and(eq(users.tenantId, tenantId), eq(users.role, 'ProjectManager')),
    });
    const employee = await db.query.users.findFirst({ where: eq(users.userId, request.userId) });

    for (const pm of pms) {
      await NotificationService.createNotification({
        tenantId,
        userId: pm.userId,
        title: `Additional Hours Request Forwarded by TL: ${employee?.fullName}`,
        message: `Team Lead forwarded an additional hours request from "${employee?.fullName}". TL notes: ${comments || 'None'}`,
        type: 'alert',
      });
    }
    return request;
  }

  // PM forwards to Accounts
  static async forwardToAccounts(requestId: number, tenantId: number, pmUserId: number, comments?: string) {
    const old = await db.query.timerRequests.findFirst({
      where: and(eq(timerRequests.requestId, requestId), eq(timerRequests.tenantId, tenantId)),
    });
    if (!old) throw new Error('Request not found');

    const combinedComments = comments
      ? `${old.comments ? old.comments + ' | PM: ' : 'PM: '}${comments}`
      : old.comments;

    const [request] = await db.update(timerRequests)
      .set({ status: 'PendingAccounts', comments: combinedComments, updatedAt: new Date() })
      .where(and(eq(timerRequests.requestId, requestId), eq(timerRequests.tenantId, tenantId)))
      .returning();

    const accountsUsers = await db.query.users.findMany({
      where: and(eq(users.tenantId, tenantId), eq(users.role, 'Accounts')),
    });
    const employee = await db.query.users.findFirst({ where: eq(users.userId, request.userId) });

    for (const acc of accountsUsers) {
      await NotificationService.createNotification({
        tenantId,
        userId: acc.userId,
        title: `Additional Hours Budget Approval Needed`,
        message: `PM forwarded an additional hours request from "${employee?.fullName}" needing ${request.requestedHours}h extra. Please review.`,
        type: 'alert',
      });
    }
    return request;
  }

  // Reject by TL or PM (both call this)
  static async respondToRequest(requestId: number, tenantId: number, userId: number, approved: boolean, comments?: string) {
    const old = await db.query.timerRequests.findFirst({
      where: and(eq(timerRequests.requestId, requestId), eq(timerRequests.tenantId, tenantId)),
    });
    if (!old) throw new Error('Request not found');

    const [request] = await db.update(timerRequests)
      .set({ status: 'Rejected', comments, updatedAt: new Date() })
      .where(and(eq(timerRequests.requestId, requestId), eq(timerRequests.tenantId, tenantId)))
      .returning();

    await NotificationService.createNotification({
      tenantId,
      userId: request.userId,
      title: `Additional Hours Request Rejected`,
      message: `Your additional hours request has been rejected. Comments: ${comments || 'None'}`,
      type: 'ticket',
    });
    return request;
  }

  // Accounts approves or rejects
  static async accountsRespondToRequest(requestId: number, tenantId: number, accountsUserId: number, approved: boolean, comments?: string) {
    const old = await db.query.timerRequests.findFirst({
      where: and(eq(timerRequests.requestId, requestId), eq(timerRequests.tenantId, tenantId)),
    });
    if (!old) throw new Error('Request not found');

    const combinedComments = comments
      ? `${old.comments ? old.comments + ' | Accounts: ' : 'Accounts: '}${comments}`
      : old.comments;

    const status = approved ? 'AccountsApproved' : 'Rejected';
    const [request] = await db.update(timerRequests)
      .set({ status, comments: combinedComments, updatedAt: new Date() })
      .where(and(eq(timerRequests.requestId, requestId), eq(timerRequests.tenantId, tenantId)))
      .returning();

    const employee = await db.query.users.findFirst({ where: eq(users.userId, request.userId) });

    if (approved) {
      // Notify HR + PM to reassign quota
      const hrs = await db.query.users.findMany({ where: and(eq(users.tenantId, tenantId), eq(users.role, 'HR')) });
      const pms = await db.query.users.findMany({ where: and(eq(users.tenantId, tenantId), eq(users.role, 'ProjectManager')) });
      for (const r of [...hrs, ...pms]) {
        await NotificationService.createNotification({
          tenantId,
          userId: r.userId,
          title: `Accounts Approved Extra Hours — Please Reassign Quota for ${employee?.fullName}`,
          message: `Accounts approved ${request.requestedHours}h extra for "${employee?.fullName}". Update their daily quota in Hour Allocation so they can submit EOD.`,
          type: 'alert',
        });
      }
      // Notify employee
      await NotificationService.createNotification({
        tenantId,
        userId: request.userId,
        title: `Additional Hours Approved by Accounts`,
        message: `Accounts approved your additional hours request. HR/PM will update your daily quota shortly so you can submit your EOD.`,
        type: 'ticket',
      });
    } else {
      await NotificationService.createNotification({
        tenantId,
        userId: request.userId,
        title: `Additional Hours Rejected by Accounts`,
        message: `Accounts rejected your additional hours request. Comments: ${comments || 'None'}`,
        type: 'ticket',
      });
    }

    return request;
  }
}
