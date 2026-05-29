import { db } from '../../db/index.js';
import { reportAccessRequests, users } from '../../db/schema/index.js';
import { eq, and, sql } from 'drizzle-orm';
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
      if (existing.status === 'Pending') {
        const [updated] = await db.update(reportAccessRequests)
          .set({ reason, updatedAt: new Date() })
          .where(eq(reportAccessRequests.requestId, existing.requestId))
          .returning();
        return updated;
      }
      if (existing.status === 'Rejected') {
        const [updated] = await db.update(reportAccessRequests)
          .set({
            status: 'Pending',
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
      status: 'Pending',
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();

    // Notify HR and PMs
    const reviewers = await db.query.users.findMany({
      where: and(
        eq(users.tenantId, tenantId),
        eq(users.isDeleted, false)
      )
    });
    const targets = reviewers.filter(u => u.role === 'HR' || u.role === 'ProjectManager' || u.role === 'TenantAdmin');

    for (const target of targets) {
      await NotificationService.createNotification({
        tenantId,
        userId: target.userId,
        title: `Report Date Access Request: ${employee.fullName}`,
        message: `${employee.fullName} has requested permission to submit a daily report for ${targetDate}. Reason: ${reason}`,
        type: 'alert'
      }).catch(() => {});
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
        eq(reportAccessRequests.status, 'Pending'),
        eq(reportAccessRequests.isDeleted, false)
      ))
      .orderBy(sql`${reportAccessRequests.createdAt} DESC`);

    return results;
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
