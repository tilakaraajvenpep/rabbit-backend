import { db } from '../../db/index.js';
import { leaves, users, projects, tickets, alerts } from '../../db/schema/index.js';
import { eq, and, inArray } from 'drizzle-orm';
import { sendEmail } from '../../utils/email.js';
import { NotificationService } from '../notification/notification.service.js';

export class LeaveService {
  static async applyLeave({ tenantId, userId, fromDate, toDate, leaveDate, type, reason, autoApprove }: any) {
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

    // When autoApprove is true (e.g. from EOD page), directly approve
    const initialStatus = autoApprove ? 'Approved' : 'Pending';

    const createdLeaves = [];
    for (const dateVal of dates) {
      const [newLeave] = await db.insert(leaves).values({
        tenantId,
        userId,
        leaveDate: dateVal,
        type, // 'HalfDay', 'FullDay', or 'Permission'
        reason,
        status: initialStatus
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

    const typeLabel = type === 'HalfDay' ? 'Half Day Leave' : type === 'FullDay' ? 'Full Day Leave' : 'Permission';

    if (autoApprove) {
      // === Auto-Approved Path: Notify HR only ===
      const emailSubject = `[Auto-Approved] Leave Record — ${employee.fullName} (${typeLabel})`;
      const emailBody = `
        <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
          <h2 style="color: #10b981;">Leave Auto-Approved</h2>
          <p>This leave was <strong>automatically approved</strong> by the employee via the EOD Report page.</p>
          <p><strong>Employee:</strong> ${employee.fullName}</p>
          <p><strong>Email:</strong> ${employee.email}</p>
          <p><strong>Date(s):</strong> ${dateRangeStr}</p>
          <p><strong>Leave Type:</strong> ${typeLabel}</p>
          <p><strong>Reason:</strong> ${reason || 'No reason provided'}</p>
          <p>This record has been saved in the system and is already approved. No action required.</p>
        </div>
      `;

      // Find HR users in tenant to notify
      const hrUsers = await db.query.users.findMany({
        where: and(
          eq(users.tenantId, tenantId),
          eq(users.role, 'HR'),
          eq(users.isDeleted, false)
        )
      });

      // Fallback: also notify PMs if no HR users found
      const notifyTargets = hrUsers.length > 0 ? hrUsers : pms;

      for (const target of notifyTargets) {
        sendEmail({ to: target.email, subject: emailSubject, html: emailBody })
          .catch(err => console.error(`Failed to send auto-approve leave email to ${target.email}:`, err));

        try {
          await NotificationService.createNotification({
            tenantId,
            userId: target.userId,
            title: `Leave Auto-Approved: ${employee.fullName}`,
            message: `${employee.fullName}'s ${typeLabel} for ${dateRangeStr} has been auto-approved. Reason: ${reason || 'N/A'}`,
            type: 'leave'
          });
        } catch (notifErr) {
          console.error(`Failed to create HR notification for leave:`, notifErr);
        }
      }

      // Also notify the employee
      try {
        await NotificationService.createNotification({
          tenantId,
          userId,
          title: `Leave Approved: ${typeLabel}`,
          message: `Your ${typeLabel} request for ${dateRangeStr} has been automatically approved.`,
          type: 'leave'
        });
      } catch (notifErr) {
        console.error('Failed to create employee leave notification:', notifErr);
      }

    } else {
      // === Standard Pending Path: Notify PMs and Team Leads ===
      const emailSubject = `Leave Request — ${employee.fullName} (${typeLabel})`;
      const emailBody = `
        <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
          <h2 style="color: #4f46e5;">Leave Request</h2>
          <p><strong>Employee:</strong> ${employee.fullName}</p>
          <p><strong>Date(s):</strong> ${dateRangeStr}</p>
          <p><strong>Type:</strong> ${typeLabel}</p>
          <p><strong>Reason:</strong> ${reason || 'No reason provided'}</p>
          <p>Please log in to the Rabbit Platform to approve or reject this request.</p>
        </div>
      `;

      for (const pm of pms) {
        sendEmail({ to: pm.email, subject: emailSubject, html: emailBody })
          .catch(err => console.error(`Failed to send email to PM ${pm.email}:`, err));
        try {
          await NotificationService.createNotification({
            tenantId,
            userId: pm.userId,
            title: `New Leave Request: ${employee.fullName}`,
            message: `${employee.fullName} requested ${typeLabel} for ${dateRangeStr}. Reason: ${reason || 'N/A'}`,
            type: 'leave'
          });
        } catch (notifErr) {
          console.error(`Failed to create notification for PM ${pm.email}:`, notifErr);
        }
      }

      for (const tl of teamLeads) {
        sendEmail({ to: tl.email, subject: emailSubject, html: emailBody })
          .catch(err => console.error(`Failed to send email to TL ${tl.email}:`, err));
        try {
          await NotificationService.createNotification({
            tenantId,
            userId: tl.userId,
            title: `New Leave Request: ${employee.fullName}`,
            message: `${employee.fullName} requested ${typeLabel} for ${dateRangeStr}. Reason: ${reason || 'N/A'}`,
            type: 'leave'
          });
        } catch (notifErr) {
          console.error(`Failed to create notification for TL ${tl.email}:`, notifErr);
        }
      }
    }

    // Create system alert for project awareness
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
          type: 'Leave Alert',
          severity: 'Medium',
          message: `${autoApprove ? '[Auto-Approved] ' : ''}Leave: ${employee.fullName} — ${typeLabel} on ${dateRangeStr}. Reason: ${reason || 'N/A'}`
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

  static async updateLeave(leaveId: number, userId: number, tenantId: number, { leaveDate, type, reason }: any) {
    const existing = await db.query.leaves.findFirst({
      where: and(
        eq(leaves.leaveId, leaveId),
        eq(leaves.userId, userId),
        eq(leaves.tenantId, tenantId),
        eq(leaves.isDeleted, false)
      )
    });

    if (!existing) {
      throw new Error('Leave request not found or not owned by you.');
    }

    if (existing.status !== 'Pending') {
      throw new Error('You can only edit pending leave requests.');
    }

    if (leaveDate && leaveDate !== existing.leaveDate) {
      const conflict = await db.query.leaves.findFirst({
        where: and(
          eq(leaves.userId, userId),
          eq(leaves.leaveDate, leaveDate),
          eq(leaves.isDeleted, false)
        )
      });
      if (conflict && conflict.leaveId !== leaveId) {
        throw new Error(`You already have a leave request on ${leaveDate}.`);
      }
    }

    const [updated] = await db.update(leaves)
      .set({
        leaveDate: leaveDate || existing.leaveDate,
        type: type || existing.type,
        reason: reason || existing.reason,
        updatedAt: new Date()
      })
      .where(and(eq(leaves.leaveId, leaveId), eq(leaves.userId, userId), eq(leaves.tenantId, tenantId)))
      .returning();

    return updated;
  }

  static async deleteLeave(leaveId: number, userId: number, tenantId: number) {
    const existing = await db.query.leaves.findFirst({
      where: and(
        eq(leaves.leaveId, leaveId),
        eq(leaves.userId, userId),
        eq(leaves.tenantId, tenantId),
        eq(leaves.isDeleted, false)
      )
    });

    if (!existing) {
      throw new Error('Leave request not found or not owned by you.');
    }

    if (existing.status !== 'Pending') {
      throw new Error('You can only delete pending leave requests.');
    }

    const [deleted] = await db.update(leaves)
      .set({
        isDeleted: true,
        updatedAt: new Date()
      })
      .where(and(eq(leaves.leaveId, leaveId), eq(leaves.userId, userId), eq(leaves.tenantId, tenantId)))
      .returning();

    return deleted;
  }
}
