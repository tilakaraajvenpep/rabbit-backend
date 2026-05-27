import { db } from '../src/db/index.js';
import { users } from '../src/db/schema/users.js';
import { eq } from 'drizzle-orm';

async function check() {
  try {
    const res = await db.select().from(users).where(eq(users.userId, 31));
    console.log('User 31 data:', JSON.stringify(res, null, 2));
  } catch (e: any) {
    console.error('Error:', e.message);
  }
}

check();
