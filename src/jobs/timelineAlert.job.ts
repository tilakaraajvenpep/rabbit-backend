import cron from 'node-cron';
import { db } from '../db/index.js';
import { projects } from '../db/schema/index.js';
import { and, lt, ne, eq } from 'drizzle-orm';
import { AlertService } from '../modules/alert/alert.service.js';
import logger from '../utils/logger.js';

export const initJobs = () => {
  // Run at 9:00 AM daily
  cron.schedule('0 9 * * *', async () => {
    logger.info('Running timeline alert job...');
    
    try {
    const today = new Date();
      
      const delayedProjects = await db.query.projects.findMany({
        where: and(
          lt(projects.endDate, today),
          ne(projects.status, 'Completed'),
          eq(projects.isDeleted, false)
        ),
      });

      for (const project of delayedProjects) {
        await AlertService.createAlert({
          tenantId: project.tenantId,
          projectId: project.projectId,
          type: 'Timeline',
          severity: 'High',
          message: `Project ${project.projectCode} has passed its end date (${project.endDate}) but is still ${project.status}.`,
        });
      }

      logger.info(`Timeline alert job finished. Generated alerts for ${delayedProjects.length} projects.`);
    } catch (err) {
      logger.error('Timeline alert job failed:', err);
    }
  });

  // Reset Employee and other logging roles' allocated hours every Monday at 12:00 AM (0 0 * * 1)
  cron.schedule('0 0 * * 1', async () => {
    logger.info('🔄 Running weekly work hours allocation reset...');
    try {
      const { users } = await import('../db/schema/index.js');
      const { inArray, sql } = await import('drizzle-orm');
      await db.update(users)
        .set({ 
          prevAllocatedHours: sql`CASE WHEN allocated_hours <> '0.00' THEN allocated_hours ELSE prev_allocated_hours END`,
          allocatedHours: '0.00', 
          updatedAt: new Date() 
        })
        .where(inArray(users.role, ['Employee', 'TeamLead', 'ProjectManager']));
      logger.info('✅ Weekly work hours allocation reset completed.');
    } catch (err) {
      logger.error('❌ Failed to run weekly work hours allocation reset:', err);
    }
  });

  // Notify PM of fixed hours projects monthly at 12:00 AM on the 1st day of every month (0 0 1 * *)
  cron.schedule('0 0 1 * *', async () => {
    logger.info('Running monthly fixed hours project notification job...');
    try {
      const { NotificationService } = await import('../modules/notification/notification.service.js');
      const activeFixedProjects = await db.query.projects.findMany({
        where: and(
          eq(projects.billingType, 'fixed'),
          eq(projects.status, 'Approved'),
          eq(projects.isDeleted, false)
        ),
      });

      for (const project of activeFixedProjects) {
        if (project.assignedProjectManagerId) {
          await NotificationService.createNotification({
            tenantId: project.tenantId,
            userId: project.assignedProjectManagerId,
            title: `Fixed Project Hours Assigned: ${project.projectName}`,
            message: `This is your monthly notification that the hours for project "${project.projectName}" (${project.projectCode}) are assigned. Total hours: ${project.totalHours || '0.00'}.`,
            type: 'project'
          });
        }
      }
      logger.info(`Monthly fixed hours project notification job completed for ${activeFixedProjects.length} projects.`);
    } catch (err) {
      logger.error('Monthly fixed hours project notification job failed:', err);
    }
  });
};

