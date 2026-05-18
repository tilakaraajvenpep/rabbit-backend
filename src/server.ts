import app from './app.js';
import logger from './utils/logger.js';
import { connectRedis } from './cache/redis.js';
import { initSocket } from './socket/socket.js';
import { initJobs } from './jobs/timelineAlert.job.js';
import { initEmail } from './utils/email.js';
import { createServer } from 'http';
import 'dotenv/config';

const PORT = process.env.PORT || 5000;

// Create HTTP server
const httpServer = createServer(app);

/* -----------------------
   INIT SERVICES
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
    // Redis connection (safe mode)
    try {
      await connectRedis();
      logger.info('Redis connected successfully');
    } catch (err) {
      logger.warn('Redis connection failed, continuing without Redis');
    }

    httpServer.listen(PORT, () => {
      logger.info(`🚀 Server running on http://localhost:${PORT}`);
    });

    // Graceful shutdown logs
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received. Shutting down gracefully...');
      httpServer.close(() => {
        logger.info('Process terminated');
      });
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();