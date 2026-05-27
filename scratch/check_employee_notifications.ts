import { db } from '../src/db/index.js';
import { notifications, users } from '../src/db/schema/index.js';
import { eq, and } from 'drizzle-orm';

async function checkEmployeeNotifications() {
  try {
    console.log('Querying employees in DB...');
    const employeesList = await db.query.users.findMany({
      where: and(eq(users.role, 'Employee'), eq(users.isDeleted, false))
    });
    
    console.log(`Found ${employeesList.length} active employees:`);
    for (const emp of employeesList) {
      const notifCount = await db.query.notifications.findMany({
        where: and(eq(notifications.userId, emp.userId), eq(notifications.isDeleted, false))
      });
      console.log(`- Employee ${emp.fullName} (${emp.email}, ID: ${emp.userId}) has ${notifCount.length} active notifications`);
    }
  } catch (err: any) {
    console.error('Error:', err.message);
  }
  process.exit(0);
}

checkEmployeeNotifications();
