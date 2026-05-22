import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { errorHandler } from './middleware/error.middleware.js';

// Routes
import authRoutes from './modules/auth/auth.routes.js';
import tenantRoutes from './modules/tenant/tenant.routes.js';
import projectRoutes from './modules/project/project.routes.js';
import ticketRoutes from './modules/ticket/ticket.routes.js';
import reportRoutes from './modules/report/report.routes.js';
import alertRoutes from './modules/alert/alert.routes.js';
import analyticsRoutes from './modules/analytics/analytics.routes.js';
import auditRoutes from './modules/audit/audit.routes.js';
import userRoutes from './modules/user/user.routes.js';
import leaveRoutes from './modules/leave/leave.routes.js';
import notificationRoutes from './modules/notification/notification.routes.js';


// DB + Redis (optional health check)
import { db } from './db/index.js';
import { redis } from './cache/redis.js';
import { sql } from 'drizzle-orm';
import { tickets } from './db/schema/index.js';

const app = express();

/* -----------------------
   MIDDLEWARE
------------------------ */
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

/* -----------------------
   HEALTH CHECK
------------------------ */
app.get('/health', async (req, res) => {
  try {
    const dbStatus = await db.execute(sql`SELECT 1`);
    const redisStatus = redis.isOpen ? await redis.ping() : 'disconnected';

    res.status(200).json({
      status: 'ok',
      database: dbStatus ? 'connected' : 'error',
      redis: redisStatus === 'PONG' ? 'connected' : redisStatus,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({
      status: 'error',
      message: err.message,
      timestamp: new Date().toISOString(),
    });
  }
});

/* -----------------------
   DIAGNOSTIC ENDPOINT
------------------------ */
app.get('/health/db-columns', async (req, res) => {
  try {
    const ticketRows = await db.select().from(tickets).orderBy(sql`${tickets.createdAt} DESC`).limit(10);
    res.status(200).json({ ticketRows });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/health/migrate-run', async (req, res) => {
  try {
    await db.execute(sql`ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "due_date" timestamp;`);
    await db.execute(sql`ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "milestone" varchar(200);`);
    
    // Create notifications table if not exists
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "notifications" (
        "notification_id" serial PRIMARY KEY,
        "tenant_id" integer NOT NULL,
        "user_id" integer NOT NULL,
        "title" varchar(300) NOT NULL,
        "message" text NOT NULL,
        "type" varchar(50) NOT NULL,
        "is_read" boolean DEFAULT false NOT NULL,
        "created_at" timestamp DEFAULT now(),
        "updated_at" timestamp DEFAULT now(),
        "is_deleted" boolean DEFAULT false NOT NULL
      );
    `);
    
    // Create indices
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "notifications_tenant_idx" ON "notifications" ("tenant_id");`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "notifications_user_idx" ON "notifications" ("user_id");`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "notifications_is_read_idx" ON "notifications" ("is_read");`);

    res.status(200).json({ success: true, message: "Manual migration executed successfully" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});


/* -----------------------
   API ROUTES (FIXED)
------------------------ */

// Auth
app.use('/api/auth', authRoutes);

// Core modules
app.use('/api/tenants', tenantRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/users', userRoutes);
app.use('/api/leaves', leaveRoutes);
app.use('/api/notifications', notificationRoutes);


// Analytics group
app.use('/api/analytics', analyticsRoutes);
app.use('/api/analytics/alerts', alertRoutes);
app.use('/api/analytics/audit-logs', auditRoutes);

/* -----------------------
   ERROR HANDLER
------------------------ */
app.use(errorHandler);

export default app;