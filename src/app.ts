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

// DB + Redis (optional health check)
import { db } from './db/index.js';
import { redis } from './cache/redis.js';
import { sql } from 'drizzle-orm';

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

// Analytics group
app.use('/api/analytics', analyticsRoutes);
app.use('/api/analytics/alerts', alertRoutes);
app.use('/api/analytics/audit-logs', auditRoutes);

/* -----------------------
   ERROR HANDLER
------------------------ */
app.use(errorHandler);

export default app;