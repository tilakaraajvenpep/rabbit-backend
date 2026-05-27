import { db } from '../src/db/index.js';
import { notifications } from '../src/db/schema/index.js';
import { desc } from 'drizzle-orm';

async function checkCloudNotifications() {
  try {
    console.log('Querying cloud notifications...');
    const list = await db.query.notifications.findMany({
      limit: 10,
      orderBy: [desc(notifications.createdAt)]
    });
    
    console.log(`Found ${list.length} recent notifications in cloud database:`);
    console.log(JSON.stringify(list, null, 2));
  } catch (err: any) {
    console.error('Error querying cloud notifications:', err.message);
    console.error(err);
  }
  process.exit(0);
}

checkCloudNotifications();
