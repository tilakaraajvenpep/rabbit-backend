import { db } from '../src/db/index.js';
import { users } from '../src/db/schema/users.js';
import { eq } from 'drizzle-orm';

async function check() {
  try {
    console.log('Querying all users from database...');
    const allUsers = await db.select().from(users);
    console.log(`Total users found: ${allUsers.length}`);
    allUsers.forEach(u => {
      console.log(`- [ID: ${u.userId}] Name: ${u.fullName} | Role: ${u.role} | TenantID: ${u.tenantId} | TeamLeadID: ${u.teamLeadId} | isDeleted: ${u.isDeleted}`);
    });
  } catch (e: any) {
    console.error('Error querying users:', e.message);
  }
}

check();
