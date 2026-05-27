import { db } from '../src/db/index.js';
import { tenants } from '../src/db/schema/tenants.js';
import { eq } from 'drizzle-orm';

async function check() {
  const res = await db.select().from(tenants).where(eq(tenants.tenantId, 2));
  console.log('Tenant 2 details:', res);
  process.exit(0);
}

check();
