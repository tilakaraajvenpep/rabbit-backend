import { createClient } from 'redis';
import logger from '../utils/logger.js';

export const redis = createClient({
  url: process.env.REDIS_URL,
  socket: {
    reconnectStrategy: (retries) => {
      // Prevent infinite retry loop in production logs
      if (retries > 5) return false;
      return Math.min(retries * 100, 3000);
    },
  },
});

/* -----------------------
   ERROR HANDLING
------------------------ */
redis.on('error', (err: Error) => {
  // Prevent spam logs in production
  logger.warn(`Redis Error (ignored): ${err.message}`);
});

/* -----------------------
   CONNECT REDIS SAFELY
------------------------ */
export async function connectRedis() {
  try {
    // Skip if no URL provided
    if (!process.env.REDIS_URL) {
      logger.warn('Redis URL not found - running without Redis');
      return;
    }

    // Prevent multiple connections
    if (redis.isOpen) return;

    await redis.connect();
    logger.info('✅ Redis Connected');

  } catch (err: any) {
    logger.warn('⚠️ Redis disabled or unavailable');
  }
}