import { redis } from '../cache/redis.js';

export const generateCode = async (prefix: string, tenantId: number) => {
  const key = `seq:${prefix}:${tenantId}`;
  
  let seq = 0;
  if (redis.isOpen) {
    try {
      seq = await redis.incr(key);
    } catch (redisErr) {
      console.warn('Redis incr failed in generateCode (falling back to random):', redisErr);
      seq = Math.floor(Math.random() * 10000);
    }
  } else {
    // Fallback if Redis is down (simplified for dev)
    // In prod, Redis is mandatory for unique sequential codes
    seq = Math.floor(Math.random() * 10000); 
  }

  return `${prefix}-${String(seq).padStart(4, '0')}`;
};
