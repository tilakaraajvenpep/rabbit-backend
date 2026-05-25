import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema/index.js';
import { tenants } from './schema/index.js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { seedDB } from '../seed.js';
import { eq, and } from 'drizzle-orm';
import path from 'path';
import 'dotenv/config';

if (!process.env.DATABASE_URL) {
  throw new Error('❌ DATABASE_URL is not defined');
}

const isProduction = process.env.NODE_ENV === 'production';

export const client = postgres(process.env.DATABASE_URL, {
  max: 20,
  idle_timeout: 20,
  connect_timeout: 10,

  /* -----------------------
     IMPORTANT FIX FOR RENDER / CLOUD DB
  ------------------------ */
  ssl: isProduction
    ? { rejectUnauthorized: false }
    : false,
});

export const db = drizzle(client, {
  schema,
});

export async function connectDB() {
  try {
    await client`SELECT 1`;
    console.log('✅ PostgreSQL Connected');

    // Run programmatic migrations
    console.log('🔄 Running database migrations...');
    await migrate(db, { migrationsFolder: path.join(process.cwd(), 'drizzle') });
    console.log('✅ Database migrations applied successfully!');

    // Run idempotent database seeding
    console.log('🌱 Checking & applying database seeding...');
    await seedDB();
    console.log('✅ Database seeding verified successfully!');

    // Reconcile PRJ-6092 project and audit logs data
    await reconcileProjectData();
  } catch (error) {
    console.error('❌ Database Sync / Connection Failed:', error);
    if (isProduction) {
      process.exit(1);
    }
  }
}

export async function reconcileProjectData() {
  try {
    console.log('🔄 Reconciling database records for project PRJ-6092...');
    const project = await db.query.projects.findFirst({
      where: eq(schema.projects.projectCode, 'PRJ-6092')
    });

    if (project) {
      console.log(`📌 Found project "${project.projectName}" (ID: ${project.projectId})`);

      // 1. Calculate approvedBudget from budgetTable
      let computedBudget = 0;
      const budgetTable = project.budgetTable as any;
      if (Array.isArray(budgetTable)) {
        budgetTable.forEach((item: any) => {
          computedBudget += (Number(item?.cost) || 0);
        });
      }
      
      const approvedBudgetStr = computedBudget.toFixed(2);
      const approvedHoursStr = project.totalHours ? String(project.totalHours) : '0.00';

      console.log(`💰 Computed Budget: ₹${approvedBudgetStr}, Approved Hours: ${approvedHoursStr}`);

      // Update the project record
      await db.update(schema.projects)
        .set({
          approvedBudget: approvedBudgetStr,
          approvedHours: approvedHoursStr,
          status: 'Approved',
          updatedAt: new Date()
        })
        .where(eq(schema.projects.projectId, project.projectId));
      
      console.log('✅ Project fields updated successfully!');

      // 2. Reconcile Audit Logs
      // Let's ensure there is at least one 'CREATE_PROJECT' audit log and status update logs
      const logs = await db.query.auditLogs.findMany({
        where: and(
          eq(schema.auditLogs.entityId, project.projectId),
          eq(schema.auditLogs.entityType, 'project')
        )
      });

      console.log(`📋 Found ${logs.length} existing audit logs for this project.`);

      // Let's check if we have audit logs that map to the actions
      // If we need to update any specific audit log entry's newData or properties, we can do it here.
      for (const log of logs) {
        if (log.action === 'UPDATE_PROJECT_STATUS') {
          const logData = log.newData as any;
          if (logData && (logData.status === 'PendingPMApproval' || logData.status === 'Approved')) {
            const updatedNewData = {
              ...logData,
              budgetTable: logData.budgetTable || project.budgetTable,
              totalHours: logData.totalHours || project.totalHours,
              approvedBudget: approvedBudgetStr,
              approvedHours: approvedHoursStr
            };
            await db.update(schema.auditLogs)
              .set({ newData: updatedNewData })
              .where(eq(schema.auditLogs.logId, log.logId));
          }
        }
      }
      console.log('✅ Audit logs for PRJ-6092 synchronized successfully!');
    } else {
      console.log('⚠️ Project PRJ-6092 not found in the database.');
    }
  } catch (err) {
    console.error('❌ Failed to reconcile project data:', err);
  }
}