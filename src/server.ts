import app from './app.js';
import logger from './utils/logger.js';
import { connectRedis } from './cache/redis.js';
import { initSocket } from './socket/socket.js';
import { initJobs } from './jobs/timelineAlert.job.js';
import { initEmail } from './utils/email.js';
import { createServer } from 'http';
import 'dotenv/config';

/* -----------------------
   PORT (FIXED FOR TYPESCRIPT + RENDER)
------------------------ */
const PORT: number = Number(process.env.PORT) || 5000;

/* -----------------------
   CREATE SERVER
------------------------ */
const httpServer = createServer(app);

/* -----------------------
   INIT SERVICES (NON-BLOCKING)
------------------------ */

// Socket setup
initSocket(httpServer);

// Background jobs
initJobs();

// Email service
initEmail();

/* -----------------------
   START SERVER
------------------------ */
const startServer = async () => {
  try {
    /* -----------------------
       REDIS (SAFE MODE)
    ------------------------ */
    if (process.env.REDIS_ENABLED === 'true') {
      connectRedis()
        .then(() => logger.info('Redis connected successfully'))
        .catch(() => logger.warn('Redis unavailable, continuing without Redis'));
    } else {
      logger.warn('Redis disabled via environment config');
    }

    /* -----------------------
       START HTTP SERVER (RENDER SAFE)
    ------------------------ */
    httpServer.listen(PORT, '0.0.0.0', () => {
      logger.info(`🚀 Server running on port ${PORT}`);
      logger.info(`Health check: /health`);
    });

    /* -----------------------
       GRACEFUL SHUTDOWN
    ------------------------ */
    const shutdown = (signal: string) => {
      logger.info(`${signal} received. Shutting down gracefully...`);

      httpServer.close(() => {
        logger.info('Server closed');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();