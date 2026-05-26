import { db } from '../../db/index.js';
import { notifications, users } from '../../db/schema/index.js';
import { eq, and, desc } from 'drizzle-orm';
import { sendEmail } from '../../utils/email.js';
import logger from '../../utils/logger.js';

export class NotificationService {
  static async createNotification({
    tenantId,
    userId,
    title,
    message,
    type
  }: {
    tenantId: number;
    userId: number;
    title: string;
    message: string;
    type: 'alert' | 'ticket' | 'project' | 'leave';
  }) {
    try {
      // 1. Save in-app notification to DB
      const [newNotif] = await db.insert(notifications).values({
        tenantId,
        userId,
        title,
        message,
        type,
        isRead: false,
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();

      // 2. Fetch target user details to send email
      const targetUser = await db.query.users.findFirst({
        where: eq(users.userId, userId)
      });

      if (targetUser && targetUser.email) {
        const frontendUrl = process.env.FRONTEND_URL || 'https://rabbit-frontend-eight.vercel.app';
        const emailSubject = `[Rabbit 4.0] Notification: ${title}`;
        const emailHtml = `
          <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
            <div style="background-color: #4f46e5; padding: 20px; text-align: center; color: white;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 600;">Rabbit Platform</h1>
            </div>
            <div style="padding: 24px; background-color: #ffffff; color: #1f2937;">
              <h2 style="margin-top: 0; color: #111827; font-size: 18px;">Hello ${targetUser.fullName},</h2>
              <p style="font-size: 16px; line-height: 1.5; color: #4b5563;">You have received a new update on the Rabbit platform:</p>
              
              <div style="background-color: #f3f4f6; border-left: 4px solid #4f46e5; padding: 16px; border-radius: 4px; margin: 20px 0;">
                <h3 style="margin: 0 0 8px 0; color: #1f2937; font-size: 16px; font-weight: 600;">${title}</h3>
                <p style="margin: 0; color: #4b5563; font-size: 14px; line-height: 1.4;">${message}</p>
              </div>

              <p style="font-size: 14px; color: #6b7280; margin-top: 24px;">Please sign in to the platform to view details and take actions.</p>
              
              <div style="text-align: center; margin-top: 30px;">
                <a href="${frontendUrl}/login" 
                   style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500; font-size: 14px; display: inline-block;">
                  Go to Dashboard
                </a>
              </div>
            </div>
            <div style="background-color: #f9fafb; padding: 16px; text-align: center; color: #9ca3af; font-size: 12px; border-top: 1px solid #e5e7eb;">
              This is an automated message, please do not reply directly to this email.
            </div>
          </div>
        `;

        // Send email asynchronously so it doesn't block the main flow
        sendEmail({
          to: targetUser.email,
          subject: emailSubject,
          html: emailHtml
        }).catch(err => {
          logger.error(`Error sending notification email to ${targetUser.email}:`, err);
        });
      }

      return newNotif;
    } catch (err) {
      logger.error('Failed to create notification:', err);
      throw err;
    }
  }

  static async getNotifications(userId: number, tenantId: number) {
    return await db.query.notifications.findMany({
      where: and(
        eq(notifications.userId, userId),
        eq(notifications.tenantId, tenantId),
        eq(notifications.isDeleted, false)
      ),
      orderBy: [desc(notifications.createdAt)]
    });
  }

  static async markAsRead(notificationId: number, userId: number, tenantId: number) {
    const [updated] = await db.update(notifications)
      .set({ isRead: true, updatedAt: new Date() })
      .where(and(
        eq(notifications.notificationId, notificationId),
        eq(notifications.userId, userId),
        eq(notifications.tenantId, tenantId)
      ))
      .returning();
    return updated;
  }

  static async markAllAsRead(userId: number, tenantId: number) {
    return await db.update(notifications)
      .set({ isRead: true, updatedAt: new Date() })
      .where(and(
        eq(notifications.userId, userId),
        eq(notifications.tenantId, tenantId)
      ))
      .returning();
  }
}
