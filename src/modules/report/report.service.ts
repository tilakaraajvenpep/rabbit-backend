import { db } from '../../db/index.js';
import { dailyReports, dailyReportItems, tickets, auditLogs, users } from '../../db/schema/index.js';
import { eq, and, sql, gte, lte } from 'drizzle-orm';
import { redis } from '../../cache/redis.js';
import { validateTotalHours } from '../../utils/hoursValidator.js';
import { emitToRoom } from '../../socket/socket.js';

export class ReportService {
  static async submitDailyReport({ tenantId, userId, data }: any) {
    const { reportDate, items } = data;

    // 1. Validate 8.5 hours
    if (!validateTotalHours(items)) {
      throw new Error('Total hours must be exactly 8.5');
    }

    // 2. Clear duplicate check if any (since we allow updates now)
    const redisKey = `report:submitted:${tenantId}:${userId}:${reportDate}`;
    
    // 3. DB Transaction
    return await db.transaction(async (tx) => {
      // Check if report exists
      let existing = await tx.query.dailyReports.findFirst({
        where: and(eq(dailyReports.userId, userId), eq(dailyReports.reportDate, reportDate), eq(dailyReports.isDeleted, false)),
      });

      let report;
      if (existing) {
        // Delete old items
        await tx.delete(dailyReportItems).where(eq(dailyReportItems.reportId, existing.reportId));
        report = existing;
      } else {
        // Insert new Report
        const [insertedReport] = await tx.insert(dailyReports).values({
          tenantId,
          userId,
          reportDate,
          totalHours: '8.50',
        }).returning();
        report = insertedReport;
      }

      // Insert Items
      await tx.insert(dailyReportItems).values(
        items.map((item: any) => ({
          ...item,
          reportId: report.reportId,
          tenantId,
          hoursSpent: String(item.hoursSpent),
        }))
      );

      // Set Redis dedup key
      if (redis.isOpen) {
        await redis.set(redisKey, '1', { EX: 86400 });
      }

      // Notify TeamLead room (simplified)
      emitToRoom(`teamlead:${tenantId}`, 'report-submitted', { userId, reportDate });

      return report;
    });
  }

  static async getReportByDate(userId: number, tenantId: number, date: string) {
    const report = await db.query.dailyReports.findFirst({
      where: and(eq(dailyReports.userId, userId), eq(dailyReports.tenantId, tenantId), eq(dailyReports.reportDate, date), eq(dailyReports.isDeleted, false)),
    });

    if (!report) return null;

    const items = await db.query.dailyReportItems.findMany({
      where: and(eq(dailyReportItems.reportId, report.reportId), eq(dailyReportItems.tenantId, tenantId), eq(dailyReportItems.isDeleted, false)),
    });

    return {
      ...report,
      items: items.map(i => ({
        ...i,
        hours: Number(i.hoursSpent),
        ticketId: i.ticketId
      }))
    };
  }

  static async getMyReports(userId: number, tenantId: number) {
    return await db.query.dailyReports.findMany({
      where: and(eq(dailyReports.userId, userId), eq(dailyReports.tenantId, tenantId), eq(dailyReports.isDeleted, false)),
      with: {
        // items: true // relational
      },
      orderBy: (r, { desc }) => [desc(r.reportDate)],
    });
  }

  static async getReportsByRange(userId: any, tenantId: number, startDate: string, endDate: string) {
    try {
      const numericUserId = Number(userId);
      const reports = await db.query.dailyReports.findMany({
        where: (r, { eq, and, gte, lte }) => and(
          eq(r.userId, numericUserId),
          eq(r.tenantId, tenantId),
          gte(r.reportDate, startDate),
          lte(r.reportDate, endDate),
          eq(r.isDeleted, false)
        ),
        orderBy: (r, { desc }) => [desc(r.reportDate)],
      });

      const results = [];
      for (const report of reports) {
        const items = await db.query.dailyReportItems.findMany({
          where: (i, { eq, and }) => and(eq(i.reportId, report.reportId), eq(i.isDeleted, false)),
        });
        const mappedItems = items.map(i => ({
          ...i,
          hours: Number(i.hoursSpent),
          ticketId: i.ticketId
        }));
        results.push({ 
          ...report, 
          id: report.reportId,
          date: report.reportDate,
          items: mappedItems 
        });
      }
      return results;
    } catch (error) {
      console.error('Error in getReportsByRange:', error);
      throw error;
    }
  }

  static async getAllReportsByRange(tenantId: number, startDate: string, endDate: string) {
    try {
      const reports = await db.query.dailyReports.findMany({
        where: (r, { eq, and, gte, lte }) => and(
          eq(r.tenantId, tenantId),
          gte(r.reportDate, startDate),
          lte(r.reportDate, endDate),
          eq(r.isDeleted, false)
        ),
        orderBy: (r, { desc }) => [desc(r.reportDate)],
      });

      const results = [];
      for (const report of reports) {
        const items = await db.query.dailyReportItems.findMany({
          where: (i, { eq, and }) => and(eq(i.reportId, report.reportId), eq(i.isDeleted, false)),
        });
        const user = await db.query.users.findFirst({
          where: (u, { eq }) => eq(u.userId, report.userId),
          columns: { fullName: true }
        });
        const mappedItems = items.map(i => ({
          ...i,
          hours: Number(i.hoursSpent),
          ticketId: i.ticketId
        }));
        results.push({ 
          ...report, 
          id: report.reportId,
          date: report.reportDate,
          items: mappedItems, 
          user 
        });
      }
      return results;
    } catch (error) {
      console.error('Error in getAllReportsByRange:', error);
      throw error;
    }
  }

  static async getTodayReports(tenantId: number) {
    const today = new Date().toISOString().split('T')[0];
    return await db.query.dailyReports.findMany({
      where: and(eq(dailyReports.reportDate, today), eq(dailyReports.tenantId, tenantId), eq(dailyReports.isDeleted, false)),
      with: {
        // items: true
      } as any
    });
  }
}
