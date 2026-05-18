// shared/cache/redis.js
import { createClient } from 'redis';
import logger from '../utils/logger.js';

let client;

export const connectRedis = async () => {
  if (client) return client;
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  client = createClient({ url: redisUrl });
  client.on('error', (err) => logger.error('Redis Client Error', err));
  await client.connect();
  logger.info('Redis connected');
  return client;
};

export const getRedis = () => client;
