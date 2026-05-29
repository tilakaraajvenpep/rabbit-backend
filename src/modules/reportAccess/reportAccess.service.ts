import { db } from '../../db/index.js';
import { reportAccessRequests, users } from '../../db/schema/index.js';
import { eq, and, sql, inArray } from 'drizzle-orm';
import { NotificationService } from '../notification/notification.service.js';

export class ReportAccessService {

  static async createRequest({ tenantId, userId, targetDate, reason }: any) {
    // Check no existing pending/approved request for same date
    const existing = await db.query.reportAccessRequests.findFirst({
      where: and(
        eq(reportAccessRequests.userId, userId),
        eq(reportAccessRequests.targetDate, targetDate),
        eq(reportAccessRequests.isDeleted, false)
      )
    });
    if (existing) {
      if (existing.status === 'Approved') {
        throw new Error('You already have an approved request to report for this date.');
      }
      if (existing.status.startsWith('Pending')) {
        const [updated] = await db.update(reportAccessRequests)
          .set({ reason, status: 'PendingTL', updatedAt: new Date() })
          .where(eq(reportAccessRequests.requestId, existing.requestId))
          .returning();
        return updated;
      }
      if (existing.status === 'Rejected') {
        const [updated] = await db.update(reportAccessRequests)
          .set({
            status: 'PendingTL',
            reason,
            reviewedByUserId: null,
            reviewerComments: null,
            updatedAt: new Date()
          })
          .where(eq(reportAccessRequests.requestId, existing.requestId))
          .returning();
        return updated;
      }
    }

    const employee = await db.query.users.findFirst({ where: eq(users.userId, userId) });
    if (!employee) throw new Error('User not found');

    const [request] = await db.insert(reportAccessRequests).values({
      tenantId,
      userId,
      targetDate,
      reason,
      status: 'PendingTL',
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();

    // Notify employee's Team Lead if assigned, else PMs
    if (employee.teamLeadId) {
      await NotificationService.createNotification({
        tenantId,
        userId: employee.teamLeadId,
        title: `Report Date Access Request: ${employee.fullName}`,
        message: `${employee.fullName} has requested permission to submit a daily report for ${targetDate}. Reason: ${reason}`,
        type: 'alert'
      }).catch(() => {});
    } else {
      const pms = await db.query.users.findMany({
        where: and(eq(users.tenantId, tenantId), eq(users.role, 'ProjectManager'), eq(users.isDeleted, false))
      });
      for (const pm of pms) {
        await NotificationService.createNotification({
          tenantId,
          userId: pm.userId,
          title: `Report Date Access Request: ${employee.fullName}`,
          message: `${employee.fullName} has requested permission to submit a daily report for ${targetDate}. Reason: ${reason}`,
          type: 'alert'
        }).catch(() => {});
      }
    }

    return request;
  }

  static async getMyRequests(tenantId: number, userId: number) {
    return await db.select()
      .from(reportAccessRequests)
      .where(and(
        eq(reportAccessRequests.tenantId, tenantId),
        eq(reportAccessRequests.userId, userId),
        eq(reportAccessRequests.isDeleted, false)
      ))
      .orderBy(sql`${reportAccessRequests.createdAt} DESC`);
  }

  static async getPendingRequests(tenantId: number) {
    // Default fallback (e.g. HR or TenantAdmin sees all standard pending statuses)
    const results = await db.select({
      requestId: reportAccessRequests.requestId,
      tenantId: reportAccessRequests.tenantId,
      userId: reportAccessRequests.userId,
      targetDate: reportAccessRequests.targetDate,
      reason: reportAccessRequests.reason,
      status: reportAccessRequests.status,
      reviewedByUserId: reportAccessRequests.reviewedByUserId,
      reviewerComments: reportAccessRequests.reviewerComments,
      createdAt: reportAccessRequests.createdAt,
      updatedAt: reportAccessRequests.updatedAt,
      employeeName: users.fullName,
      employeeEmail: users.email
    })
      .from(reportAccessRequests)
      .leftJoin(users, eq(reportAccessRequests.userId, users.userId))
      .where(and(
        eq(reportAccessRequests.tenantId, tenantId),
        inArray(reportAccessRequests.status, ['Pending', 'PendingTL', 'PendingPM', 'PendingAccounts']),
        eq(reportAccessRequests.isDeleted, false)
      ))
      .orderBy(sql`${reportAccessRequests.createdAt} DESC`);

    return results;
  }

  static async getTLPendingRequests(tenantId: number, tlUserId: number) {
    const employees = await db.query.users.findMany({
      where: and(eq(users.teamLeadId, tlUserId), eq(users.tenantId, tenantId)),
    });
    const employeeIds = employees.map(e => e.userId);
    if (employeeIds.length === 0) return [];

    return await db.select({
      requestId: reportAccessRequests.requestId,
      tenantId: reportAccessRequests.tenantId,
      userId: reportAccessRequests.userId,
      targetDate: reportAccessRequests.targetDate,
      reason: reportAccessRequests.reason,
      status: reportAccessRequests.status,
      reviewedByUserId: reportAccessRequests.reviewedByUserId,
      reviewerComments: reportAccessRequests.reviewerComments,
      createdAt: reportAccessRequests.createdAt,
      updatedAt: reportAccessRequests.updatedAt,
      employeeName: users.fullName,
      employeeEmail: users.email
    })
      .from(reportAccessRequests)
      .leftJoin(users, eq(reportAccessRequests.userId, users.userId))
      .where(and(
        eq(reportAccessRequests.tenantId, tenantId),
        eq(reportAccessRequests.status, 'PendingTL'),
        inArray(reportAccessRequests.userId, employeeIds),
        eq(reportAccessRequests.isDeleted, false)
      ))
      .orderBy(sql`${reportAccessRequests.createdAt} DESC`);
  }

  static async getPMPendingRequests(tenantId: number) {
    return await db.select({
      requestId: reportAccessRequests.requestId,
      tenantId: reportAccessRequests.tenantId,
      userId: reportAccessRequests.userId,
      targetDate: reportAccessRequests.targetDate,
      reason: reportAccessRequests.reason,
      status: reportAccessRequests.status,
      reviewedByUserId: reportAccessRequests.reviewedByUserId,
      reviewerComments: reportAccessRequests.reviewerComments,
      createdAt: reportAccessRequests.createdAt,
      updatedAt: reportAccessRequests.updatedAt,
      employeeName: users.fullName,
      employeeEmail: users.email
    })
      .from(reportAccessRequests)
      .leftJoin(users, eq(reportAccessRequests.userId, users.userId))
      .where(and(
        eq(reportAccessRequests.tenantId, tenantId),
        eq(reportAccessRequests.status, 'PendingPM'),
        eq(reportAccessRequests.isDeleted, false)
      ))
      .orderBy(sql`${reportAccessRequests.createdAt} DESC`);
  }

  static async getAccountsPendingRequests(tenantId: number) {
    return await db.select({
      requestId: reportAccessRequests.requestId,
      tenantId: reportAccessRequests.tenantId,
      userId: reportAccessRequests.userId,
      targetDate: reportAccessRequests.targetDate,
      reason: reportAccessRequests.reason,
      status: reportAccessRequests.status,
      reviewedByUserId: reportAccessRequests.reviewedByUserId,
      reviewerComments: reportAccessRequests.reviewerComments,
      createdAt: reportAccessRequests.createdAt,
      updatedAt: reportAccessRequests.updatedAt,
      employeeName: users.fullName,
      employeeEmail: users.email
    })
      .from(reportAccessRequests)
      .leftJoin(users, eq(reportAccessRequests.userId, users.userId))
      .where(and(
        eq(reportAccessRequests.tenantId, tenantId),
        eq(reportAccessRequests.status, 'PendingAccounts'),
        eq(reportAccessRequests.isDeleted, false)
      ))
      .orderBy(sql`${reportAccessRequests.createdAt} DESC`);
  }

  static async forwardToPM(requestId: number, tenantId: number, comments?: string) {
    const old = await db.query.reportAccessRequests.findFirst({
      where: and(eq(reportAccessRequests.requestId, requestId), eq(reportAccessRequests.tenantId, tenantId))
    });
    if (!old) throw new Error('Request not found');

    const [updated] = await db.update(reportAccessRequests)
      .set({
        status: 'PendingPM',
        reviewerComments: comments || old.reviewerComments,
        updatedAt: new Date()
      })
      .where(and(eq(reportAccessRequests.requestId, requestId), eq(reportAccessRequests.tenantId, tenantId)))
      .returning();

    const employee = await db.query.users.findFirst({ where: eq(users.userId, old.userId) });
    const pms = await db.query.users.findMany({
      where: and(eq(users.tenantId, tenantId), eq(users.role, 'ProjectManager'), eq(users.isDeleted, false))
    });
    for (const pm of pms) {
      await NotificationService.createNotification({
        tenantId,
        userId: pm.userId,
        title: `Report Access Request Forwarded to PM: ${employee?.fullName}`,
        message: `Team Lead forwarded a report access request for ${old.targetDate} from "${employee?.fullName}". Notes: ${comments || 'None'}`,
        type: 'alert'
      }).catch(() => {});
    }

    return updated;
  }

  static async forwardToAccounts(requestId: number, tenantId: number, comments?: string) {
    const old = await db.query.reportAccessRequests.findFirst({
      where: and(eq(reportAccessRequests.requestId, requestId), eq(reportAccessRequests.tenantId, tenantId))
    });
    if (!old) throw new Error('Request not found');

    const combinedComments = comments
      ? `${old.reviewerComments ? old.reviewerComments + ' | PM: ' : 'PM: '}${comments}`
      : old.reviewerComments;

    const [updated] = await db.update(reportAccessRequests)
      .set({
        status: 'PendingAccounts',
        reviewerComments: combinedComments,
        updatedAt: new Date()
      })
      .where(and(eq(reportAccessRequests.requestId, requestId), eq(reportAccessRequests.tenantId, tenantId)))
      .returning();

    const employee = await db.query.users.findFirst({ where: eq(users.userId, old.userId) });
    const accounts = await db.query.users.findMany({
      where: and(eq(users.tenantId, tenantId), eq(users.role, 'Accounts'), eq(users.isDeleted, false))
    });
    for (const acc of accounts) {
      await NotificationService.createNotification({
        tenantId,
        userId: acc.userId,
        title: `Report Access Request Forwarded to Accounts: ${employee?.fullName}`,
        message: `Project Manager forwarded a report access request for ${old.targetDate} from "${employee?.fullName}". Notes: ${comments || 'None'}`,
        type: 'alert'
      }).catch(() => {});
    }

    return updated;
  }

  static async respondToRequest(requestId: number, tenantId: number, reviewerUserId: number, approved: boolean, comments?: string) {
    const existing = await db.query.reportAccessRequests.findFirst({
      where: and(
        eq(reportAccessRequests.requestId, requestId),
        eq(reportAccessRequests.tenantId, tenantId)
      )
    });
    if (!existing) throw new Error('Request not found');

    const status = approved ? 'Approved' : 'Rejected';
    const [updated] = await db.update(reportAccessRequests)
      .set({
        status,
        reviewedByUserId: reviewerUserId,
        reviewerComments: comments || null,
        updatedAt: new Date()
      })
      .where(and(
        eq(reportAccessRequests.requestId, requestId),
        eq(reportAccessRequests.tenantId, tenantId)
      ))
      .returning();

    const employee = await db.query.users.findFirst({ where: eq(users.userId, existing.userId) });

    // If approved, notify HR to update allocated hours
    if (approved) {
      const hrs = await db.query.users.findMany({ where: and(eq(users.tenantId, tenantId), eq(users.role, 'HR'), eq(users.isDeleted, false)) });
      for (const hr of hrs) {
        await NotificationService.createNotification({
          tenantId,
          userId: hr.userId,
          title: `Report Access Approved — Please Update Time for ${employee?.fullName}`,
          message: `Accounts approved EOD report access for ${employee?.fullName} on ${existing.targetDate}. Please update their allocated hours so they can submit EOD.`,
          type: 'alert',
        }).catch(() => {});
      }
    }

    // Notify employee
    await NotificationService.createNotification({
      tenantId,
      userId: existing.userId,
      title: `Report Date Access ${status}`,
      message: `Your request to report for ${existing.targetDate} has been ${status.toLowerCase()}. ${comments ? `Comments: ${comments}` : ''}`,
      type: 'ticket'
    }).catch(() => {});

    return updated;
  }

  static async checkAccess(tenantId: number, userId: number, targetDate: string): Promise<boolean> {
    const approved = await db.query.reportAccessRequests.findFirst({
      where: and(
        eq(reportAccessRequests.tenantId, tenantId),
        eq(reportAccessRequests.userId, userId),
        eq(reportAccessRequests.targetDate, targetDate),
        eq(reportAccessRequests.status, 'Approved'),
        eq(reportAccessRequests.isDeleted, false)
      )
    });
    return !!approved;
  }
}
