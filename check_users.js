import { db } from './src/db/index.js';
import { users } from './src/db/schema/index.js';

async function check() {
  const all = await db.select({
    email: users.email,
    role: users.role,
    tenantId: users.tenantId
  }).from(users);
  console.log(JSON.stringify(all, null, 2));
  process.exit(0);
}

check();
