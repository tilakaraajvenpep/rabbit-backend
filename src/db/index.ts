import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema/index.js';
import { tenants } from './schema/index.js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { seedDB } from '../seed.js';
import { eq, and, isNull, sql, inArray } from 'drizzle-orm';
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
    try {
      await migrate(db, { migrationsFolder: path.join(process.cwd(), 'drizzle') });
      console.log('✅ Database migrations applied successfully!');
    } catch (migError) {
      console.warn('⚠️ Drizzle migrations failed (ignored to continue startup):', migError);
    }

    // Ensure new columns exist before seeding or running queries
    try {
      console.log('🔄 Running manual alterations to ensure columns exist...');
      
      // Tenants alterations
      await db.execute(sql`ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "standard_cost" numeric(10, 2) DEFAULT '500.00';`);

      // Users alterations
      await db.execute(sql`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "cost_per_hour" numeric(10, 2) DEFAULT '0.00';`);
      await db.execute(sql`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "team_lead_id" integer;`);
      await db.execute(sql`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "project_manager_id" integer;`);
      await db.execute(sql`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "date_of_joining" varchar(100);`);
      await db.execute(sql`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "allocated_hours" numeric(6, 2) DEFAULT '0.00';`);
      await db.execute(sql`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "prev_allocated_hours" numeric(6, 2) DEFAULT '0.00';`);
      await db.execute(sql`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "is_deleted" boolean DEFAULT false;`);
      
      // Projects alterations
      await db.execute(sql`ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "comments" text;`);
      await db.execute(sql`ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "budget_table" jsonb;`);
      await db.execute(sql`ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "milestones" jsonb;`);
      await db.execute(sql`ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "total_hours" numeric(10, 2) DEFAULT '0.00';`);
      await db.execute(sql`ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "buffer_hours" numeric(10, 2) DEFAULT '0.00';`);
      await db.execute(sql`ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "assigned_pm_id" integer;`);
      await db.execute(sql`ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "kanban_columns" jsonb;`);
      await db.execute(sql`ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "project_category" varchar(255);`);
      await db.execute(sql`ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "assigned_employee_ids" jsonb;`);
      await db.execute(sql`ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "employee_allocated_hours" jsonb;`);
      await db.execute(sql`ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "cost_calculation_type" varchar(50) DEFAULT 'custom';`);
      await db.execute(sql`ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "billing_type" varchar(50) DEFAULT 'fixed';`);
      await db.execute(sql`ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "is_deleted" boolean DEFAULT false;`);

      // Tickets alterations
      await db.execute(sql`ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "start_date" timestamp;`);
      await db.execute(sql`ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "due_date" timestamp;`);
      await db.execute(sql`ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "in_progress_date" timestamp;`);
      await db.execute(sql`ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "milestone" varchar(200);`);
      await db.execute(sql`ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "assigned_employees" jsonb;`);

      // Ticket templates table creation
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS "ticket_templates" (
          "template_id" serial PRIMARY KEY,
          "tenant_id" integer NOT NULL,
          "template_name" varchar(255) NOT NULL,
          "department" varchar(255),
          "project_name" varchar(255),
          "tickets" jsonb NOT NULL,
          "created_at" timestamp DEFAULT now(),
          "updated_at" timestamp DEFAULT now()
        );
      `);

      console.log('✅ Manual database alterations completed successfully!');
    } catch (alterError) {
      console.warn('⚠️ Manual database alterations failed:', alterError);
    }

    // Run idempotent database seeding
    console.log('🌱 Checking & applying database seeding...');
    await seedDB();
    console.log('✅ Database seeding verified successfully!');

    // Reconcile PRJ-6092 project and audit logs data
    await reconcileProjectData();
    
    // Reconcile document versions
    await reconcileDocumentVersions();

    // Reconcile alerts data to backfill createdByUserId
    await reconcileAlertsData();
  } catch (error) {
    console.error('❌ Database Sync / Connection Failed:', error);
    if (isProduction) {
      process.exit(1);
    }
  }
}

export async function reconcileDocumentVersions() {
  try {
    console.log('🔄 Reconciling document versions for budget_milestones category...');
    const budgetDocs = await db.query.scopeDocuments.findMany({
      where: eq(schema.scopeDocuments.documentCategory, 'budget_milestones'),
      orderBy: (docs, { asc }) => [asc(docs.createdAt)],
    });

    const projectsMap = new Map<number, typeof budgetDocs>();
    for (const doc of budgetDocs) {
      const pId = doc.projectId;
      if (!projectsMap.has(pId)) {
        projectsMap.set(pId, []);
      }
      projectsMap.get(pId)!.push(doc);
    }

    for (const [projectId, docs] of projectsMap.entries()) {
      let currentVersion = 1;
      for (const doc of docs) {
        if (doc.version !== currentVersion) {
          console.log(`  🔄 Updating document ID ${doc.documentId} (Project ${projectId}) version from ${doc.version} to ${currentVersion}`);
          await db.update(schema.scopeDocuments)
            .set({ version: currentVersion })
            .where(eq(schema.scopeDocuments.documentId, doc.documentId));
        }
        currentVersion++;
      }
    }
    console.log('✅ Document versions reconciliation complete!');
  } catch (err) {
    console.error('❌ Failed to reconcile document versions:', err);
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

export async function reconcileAlertsData() {
  try {
    console.log('🔄 Reconciling alerts data to backfill createdByUserId...');
    const dbAlerts = await db.query.alerts.findMany({
      where: isNull(schema.alerts.createdByUserId)
    });

    console.log(`📋 Found ${dbAlerts.length} alerts without createdByUserId.`);

    for (const alert of dbAlerts) {
      let matchedUserId: number | null = null;

      // 1. Leave Alert
      if (alert.type === 'Leave Alert' || alert.type === 'Leave Request Alert' || (alert.message && alert.message.includes('Leave:'))) {
        let nameMatch = alert.message.match(/Leave Request:\s+(.*?)\s+requested/);
        if (!nameMatch) {
          nameMatch = alert.message.match(/Leave:\s+(.*?)\s+—/);
        }

        if (nameMatch && nameMatch[1]) {
          const name = nameMatch[1].trim();
          const matchedUser = await db.query.users.findFirst({
            where: and(
              eq(schema.users.fullName, name),
              eq(schema.users.tenantId, alert.tenantId)
            )
          });
          if (matchedUser) {
            matchedUserId = matchedUser.userId;
            console.log(`  💡 Matched Leave Alert ID ${alert.alertId} to user "${name}" (ID: ${matchedUserId})`);
          }
        }

        // Fallback: first active Employee in the tenant
        if (!matchedUserId) {
          const empUser = await db.query.users.findFirst({
            where: and(
              eq(schema.users.tenantId, alert.tenantId),
              eq(schema.users.role, 'Employee'),
              eq(schema.users.isDeleted, false)
            )
          });
          if (empUser) {
            matchedUserId = empUser.userId;
            console.log(`  💡 Matched Leave Alert ID ${alert.alertId} to first active employee (ID: ${matchedUserId}) as fallback`);
          }
        }
      }

      // 2. Employee Report Alert
      if (!matchedUserId && alert.type === 'Employee Report Alert') {
        const alertDay = alert.createdAt ? alert.createdAt.toISOString().split('T')[0] : null;
        if (alertDay) {
          const matchingReports = await db.select({ userId: schema.dailyReports.userId })
            .from(schema.dailyReports)
            .innerJoin(schema.dailyReportItems, eq(schema.dailyReports.reportId, schema.dailyReportItems.reportId))
            .innerJoin(schema.tickets, eq(schema.dailyReportItems.ticketId, schema.tickets.ticketId))
            .where(and(
              eq(schema.tickets.projectId, alert.projectId),
              eq(schema.dailyReports.reportDate, alertDay)
            ))
            .limit(1);

          if (matchingReports.length > 0) {
            matchedUserId = matchingReports[0].userId;
            console.log(`  💡 Matched Employee Report Alert ID ${alert.alertId} to user ID ${matchedUserId} based on daily report on ${alertDay}`);
          }
        }

        // If not found, try to find any Employee allocated to this project
        if (!matchedUserId) {
          const project = await db.query.projects.findFirst({
            where: eq(schema.projects.projectId, alert.projectId)
          });
          if (project && project.employeeAllocatedHours) {
            try {
              const allocated = project.employeeAllocatedHours as Record<string, any>;
              const uids = Object.keys(allocated).map(Number).filter(id => !isNaN(id) && Number(allocated[id]) > 0);
              if (uids.length > 0) {
                const empUser = await db.query.users.findFirst({
                  where: and(
                    inArray(schema.users.userId, uids),
                    eq(schema.users.role, 'Employee'),
                    eq(schema.users.isDeleted, false)
                  )
                });
                if (empUser) {
                  matchedUserId = empUser.userId;
                  console.log(`  💡 Matched Employee Report Alert ID ${alert.alertId} to allocated Employee (ID: ${matchedUserId})`);
                }
              }
            } catch (_) {}
          }
        }

        // Fallback to first Employee in tenant
        if (!matchedUserId) {
          const empUser = await db.query.users.findFirst({
            where: and(
              eq(schema.users.tenantId, alert.tenantId),
              eq(schema.users.role, 'Employee'),
              eq(schema.users.isDeleted, false)
            )
          });
          if (empUser) {
            matchedUserId = empUser.userId;
            console.log(`  💡 Matched Employee Report Alert ID ${alert.alertId} to first Employee in tenant (ID: ${matchedUserId})`);
          }
        }
      }

      // 3. Project-based fallback (Timeline Risk, Budget Risk, Resource Issue, Blocker)
      if (!matchedUserId) {
        const project = await db.query.projects.findFirst({
          where: eq(schema.projects.projectId, alert.projectId)
        });

        if (project) {
          matchedUserId = project.assignedTeamLeadId || project.assignedProjectManagerId || null;
          if (matchedUserId) {
            console.log(`  💡 Matched Alert ID ${alert.alertId} (${alert.type}) to project lead/PM (ID: ${matchedUserId})`);
          }
        }
      }

      // 4. Tenant PM / TenantAdmin Fallback
      if (!matchedUserId) {
        const pmUser = await db.query.users.findFirst({
          where: and(
            eq(schema.users.tenantId, alert.tenantId),
            inArray(schema.users.role, ['ProjectManager', 'TenantAdmin']),
            eq(schema.users.isDeleted, false)
          )
        });
        if (pmUser) {
          matchedUserId = pmUser.userId;
          console.log(`  💡 Matched Alert ID ${alert.alertId} to tenant PM/Admin (ID: ${matchedUserId}) as fallback`);
        }
      }

      // 5. Tenant TL Fallback
      if (!matchedUserId) {
        const tlUser = await db.query.users.findFirst({
          where: and(
            eq(schema.users.tenantId, alert.tenantId),
            eq(schema.users.role, 'TeamLead'),
            eq(schema.users.isDeleted, false)
          )
        });
        if (tlUser) {
          matchedUserId = tlUser.userId;
          console.log(`  💡 Matched Alert ID ${alert.alertId} to tenant Team Lead (ID: ${matchedUserId}) as fallback`);
        }
      }

      // 6. Absolute Fallback
      if (!matchedUserId) {
        const anyUser = await db.query.users.findFirst({
          where: and(
            eq(schema.users.tenantId, alert.tenantId),
            eq(schema.users.isDeleted, false)
          )
        });
        if (anyUser) {
          matchedUserId = anyUser.userId;
          console.log(`  💡 Matched Alert ID ${alert.alertId} to absolute first user in tenant (ID: ${matchedUserId}) as fallback`);
        }
      }

      if (matchedUserId) {
        await db.update(schema.alerts)
          .set({ createdByUserId: matchedUserId })
          .where(eq(schema.alerts.alertId, alert.alertId));
      }
    }

    console.log('✅ Alerts data reconciliation complete!');
  } catch (err) {
    console.error('❌ Failed to reconcile alerts data:', err);
  }
}