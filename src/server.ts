import app from './app.js';
import logger from './utils/logger.js';
import { connectRedis } from './cache/redis.js';
import { initSocket } from './socket/socket.js';
import { initJobs } from './jobs/timelineAlert.job.js';
import { initEmail } from './utils/email.js';
import { createServer } from 'http';
import 'dotenv/config';

const PORT = process.env.PORT || 5000;
const httpServer = createServer(app);
initSocket(httpServer);
initJobs();
initEmail();

const startServer = async () => {
  try {
    // Connect Redis
    // try {
    //   await connectRedis();
    // } catch (err) {
    //   logger.error('Redis connection failed, continuing without Redis:', err);
    // }
    
    httpServer.listen(PORT, () => {
      logger.info(`Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
