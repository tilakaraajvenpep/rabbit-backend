import { createClient } from 'redis';

let redis: any = null;

try {
  redis = createClient({
    url: process.env.REDIS_URL
  });

  redis.on('error', (err: any) => {
    console.log('Redis Error:', err.message);
  });

  redis.connect();
} catch (err) {
  console.log('Redis disabled');
}

export { redis };