import { createClient } from 'redis';

export const redis = createClient({
  url: process.env.REDIS_URL
});

redis.on('error', (err: Error) => {
  console.log('Redis Error:', err.message);
});

export async function connectRedis() {
  try {
    if (!redis.isOpen) {
      await redis.connect();
      console.log('✅ Redis Connected');
    }
  } catch (err) {
    console.log('⚠️ Redis disabled');
  }
}