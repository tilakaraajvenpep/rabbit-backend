import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { errorHandler } from './middleware/error.middleware.js';
import authRoutes from './modules/auth/auth.routes.js';
import tenantRoutes from './modules/tenant/tenant.routes.js';
import projectRoutes from './modules/project/project.routes.js';
import ticketRoutes from './modules/ticket/ticket.routes.js';
import reportRoutes from './modules/report/report.routes.js';
import alertRoutes from './modules/alert/alert.routes.js';
import analyticsRoutes from './modules/analytics/analytics.routes.js';
import auditRoutes from './modules/audit/audit.routes.js';
import userRoutes from './modules/user/user.routes.js';
import { db } from './db/index.js';
import { redis } from './cache/redis.js';
import { sql } from 'drizzle-orm';

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// Health Check
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

// Routes
app.use('/auth', authRoutes);
app.use('/tenants', tenantRoutes);
app.use('/projects', projectRoutes);
app.use('/tickets', ticketRoutes);
app.use('/reports', reportRoutes);
app.use('/analytics', analyticsRoutes);
app.use('/analytics/alerts', alertRoutes);
app.use('/analytics/audit-logs', auditRoutes);
app.use('/users', userRoutes);

// Error Handler
app.use(errorHandler);

export default app;
