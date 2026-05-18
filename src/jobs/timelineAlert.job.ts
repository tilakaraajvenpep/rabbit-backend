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
};
