import { db } from '../../db/index.js';
import { leaves, users, projects, tickets, alerts } from '../../db/schema/index.js';
import { eq, and, inArray } from 'drizzle-orm';
import { sendEmail } from '../../utils/email.js';
import { NotificationService } from '../notification/notification.service.js';

export class LeaveService {
  static async applyLeave({ tenantId, userId, fromDate, toDate, leaveDate, type, reason }: any) {
    const dates: string[] = [];
    
    if (fromDate && toDate) {
      const start = new Date(fromDate);
      const end = new Date(toDate);
      const current = new Date(start);
      while (current <= end) {
        dates.push(current.toISOString().split('T')[0]);
        current.setDate(current.getDate() + 1);
      }
    } else if (leaveDate) {
      dates.push(leaveDate);
    }

    if (dates.length === 0) {
      throw new Error('No valid dates provided for leave request.');
    }

    // 2. Get Employee Details
    const employee = await db.query.users.findFirst({
      where: eq(users.userId, userId)
    });

    if (!employee) {
      throw new Error('Employee not found.');
    }

    // Verify no existing leaves on ANY of the requested dates
    for (const dateVal of dates) {
      const existing = await db.query.leaves.findFirst({
        where: and(
          eq(leaves.userId, userId),
          eq(leaves.leaveDate, dateVal),
          eq(leaves.isDeleted, false)
        )
      });
      if (existing) {
        throw new Error(`You have already requested or have an active leave request on ${dateVal}.`);
      }
    }

    const createdLeaves = [];
    for (const dateVal of dates) {
      const [newLeave] = await db.insert(leaves).values({
        tenantId,
        userId,
        leaveDate: dateVal,
        type, // 'HalfDay' or 'FullDay'
        reason,
        status: 'Pending'
      }).returning();
      createdLeaves.push(newLeave);
    }

    // 4. Find PM and concerned Team Leads
    // Let's find PMs in this tenant
    const pms = await db.query.users.findMany({
      where: and(
        eq(users.tenantId, tenantId),
        eq(users.role, 'ProjectManager'),
        eq(users.isDeleted, false)
      )
    });

    // Let's find projects this employee works on (has tickets assigned)
    const employeeTickets = await db.query.tickets.findMany({
      where: and(
        eq(tickets.assignedToUserId, userId),
        eq(tickets.isDeleted, false)
      )
    });

    const projectIds = [...new Set(employeeTickets.map(t => t.projectId))];

    // Find concerned Team Leads (assigned to these projects)
    let teamLeads: any[] = [];
    if (projectIds.length > 0) {
      const projectsList = await db.query.projects.findMany({
        where: and(
          inArray(projects.projectId, projectIds as number[]),
          eq(projects.tenantId, tenantId),
          eq(projects.isDeleted, false)
        )
      });
      const tlIds = [...new Set(projectsList.map(p => p.assignedTeamLeadId).filter(id => !!id))] as number[];
      if (tlIds.length > 0) {
        teamLeads = await db.query.users.findMany({
          where: and(
            inArray(users.userId, tlIds),
            eq(users.isDeleted, false)
          )
        });
      }
    }

    // If no project-specific Team Lead is found, default to any Team Lead in the tenant
    if (teamLeads.length === 0) {
      teamLeads = await db.query.users.findMany({
        where: and(
          eq(users.tenantId, tenantId),
          eq(users.role, 'TeamLead'),
          eq(users.isDeleted, false)
        )
      });
    }

    const dateRangeStr = dates.length === 1 ? dates[0] : `${dates[0]} to ${dates[dates.length - 1]}`;

    // 5. Send alerts / notifications / emails
    const emailSubject = `Leave Request Applied - ${employee.fullName} (${type})`;
    const emailBody = `
      <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
        <h2 style="color: #4f46e5;">Leave Request</h2>
        <p><strong>Employee:</strong> ${employee.fullName}</p>
        <p><strong>Date(s):</strong> ${dateRangeStr}</p>
        <p><strong>Type:</strong> ${type === 'HalfDay' ? 'Half Day' : 'Full Day'}</p>
        <p><strong>Reason:</strong> ${reason || 'No reason provided'}</p>
        <p>Please log in to the Rabbit Platform to approve or reject this request.</p>
      </div>
    `;

    // Send email to PMs (independent of notification — email failure must not block notification)
    for (const pm of pms) {
      // Email — non-blocking
      sendEmail({ to: pm.email, subject: emailSubject, html: emailBody })
        .catch(err => console.error(`Failed to send email to PM ${pm.email}:`, err));

      // In-app notification — always attempt regardless of email
      try {
        await NotificationService.createNotification({
          tenantId,
          userId: pm.userId,
          title: `New Leave Request: ${employee.fullName}`,
          message: `${employee.fullName} requested ${type === 'HalfDay' ? 'Half Day' : 'Full Day'} leave for ${dateRangeStr}. Reason: ${reason || 'N/A'}`,
          type: 'leave'
        });
      } catch (notifErr) {
        console.error(`Failed to create notification for PM ${pm.email}:`, notifErr);
      }
    }

    // Send email to Team Leads (independent of notification)
    for (const tl of teamLeads) {
      // Email — non-blocking
      sendEmail({ to: tl.email, subject: emailSubject, html: emailBody })
        .catch(err => console.error(`Failed to send email to TL ${tl.email}:`, err));

      // In-app notification — always attempt regardless of email
      try {
        await NotificationService.createNotification({
          tenantId,
          userId: tl.userId,
          title: `New Leave Request: ${employee.fullName}`,
          message: `${employee.fullName} requested ${type === 'HalfDay' ? 'Half Day' : 'Full Day'} leave for ${dateRangeStr}. Reason: ${reason || 'N/A'}`,
          type: 'leave'
        });
      } catch (notifErr) {
        console.error(`Failed to create notification for TL ${tl.email}:`, notifErr);
      }
    }

    // Create system alert for PM/TL awareness
    // We can associate this alert with the first project or a default project
    let resolvedProjectId = projectIds[0];
    if (!resolvedProjectId) {
      const defaultProject = await db.query.projects.findFirst({
        where: and(eq(projects.tenantId, tenantId), eq(projects.isDeleted, false))
      });
      resolvedProjectId = defaultProject?.projectId || 1;
    }

    if (resolvedProjectId) {
      try {
        await db.insert(alerts).values({
          tenantId,
          projectId: resolvedProjectId,
          type: 'Leave Request Alert',
          severity: 'Medium',
          message: `Leave Request: ${employee.fullName} requested ${type === 'HalfDay' ? 'Half Day' : 'Full Day'} leave for ${dateRangeStr}. Reason: ${reason || 'N/A'}`
        });
      } catch (alertErr) {
        console.error('Failed to insert leave alert:', alertErr);
      }
    }

    return createdLeaves[0];
  }

  static async getMyLeaves(userId: number, tenantId: number) {
    return await db.query.leaves.findMany({
      where: and(
        eq(leaves.userId, userId),
        eq(leaves.tenantId, tenantId),
        eq(leaves.isDeleted, false)
      ),
      orderBy: (l, { desc }) => [desc(l.leaveDate)]
    });
  }

  static async getPendingLeaves(tenantId: number) {
    const results = await db.query.leaves.findMany({
      where: and(
        eq(leaves.tenantId, tenantId),
        eq(leaves.status, 'Pending'),
        eq(leaves.isDeleted, false)
      ),
      orderBy: (l, { desc }) => [desc(l.leaveDate)]
    });

    // Populate user names
    const populated = [];
    for (const res of results) {
      const user = await db.query.users.findFirst({
        where: eq(users.userId, res.userId),
        columns: { fullName: true, email: true }
      });
      populated.push({
        ...res,
        user
      });
    }
    return populated;
  }

  static async getAllLeaves(tenantId: number) {
    const results = await db.query.leaves.findMany({
      where: and(
        eq(leaves.tenantId, tenantId),
        eq(leaves.isDeleted, false)
      ),
      orderBy: (l, { desc }) => [desc(l.leaveDate)]
    });

    const populated = [];
    for (const res of results) {
      const user = await db.query.users.findFirst({
        where: eq(users.userId, res.userId),
        columns: { fullName: true, email: true }
      });
      populated.push({
        ...res,
        user
      });
    }
    return populated;
  }

  static async updateLeaveStatus(leaveId: number, tenantId: number, status: string) {
    const [updatedLeave] = await db.update(leaves)
      .set({ status, updatedAt: new Date() })
      .where(and(eq(leaves.leaveId, leaveId), eq(leaves.tenantId, tenantId)))
      .returning();

    if (updatedLeave) {
      try {
        await NotificationService.createNotification({
          tenantId,
          userId: updatedLeave.userId,
          title: `Leave Request ${status}`,
          message: `Your leave request for ${updatedLeave.leaveDate} has been ${status.toLowerCase()}.`,
          type: 'leave'
        });
      } catch (notifErr) {
        console.error('Failed to create leave approval notification:', notifErr);
      }
    }

    return updatedLeave;
  }
}
