import { db } from '../src/db/index.js';
import { tenants } from '../src/db/schema/tenants.js';

async function check() {
  const res = await db.select().from(tenants);
  console.log('All Tenants:', res);
  process.exit(0);
}

check();
