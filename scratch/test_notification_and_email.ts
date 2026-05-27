import { NotificationService } from '../src/modules/notification/notification.service.js';
import { db } from '../src/db/index.js';
import { users } from '../src/db/schema/index.js';
import { eq } from 'drizzle-orm';

async function testEmailAndNotification() {
  try {
    console.log('Finding test user (Tilak)...');
    const user = await db.query.users.findFirst({
      where: eq(users.email, 'tilak@venpep.com')
    });
    
    if (!user) {
      console.error('User Tilak@venpep.com not found!');
      process.exit(1);
    }
    
    console.log(`Sending notification to user: ${user.fullName} (${user.email})`);
    
    const notif = await NotificationService.createNotification({
      tenantId: user.tenantId,
      userId: user.userId,
      title: 'Verification Notification',
      message: 'Checking if notification and email logic work properly.',
      type: 'project'
    });
    
    console.log('Notification successfully created in database:');
    console.log(JSON.stringify(notif, null, 2));
    
    // Wait a couple of seconds for async email sending to log
    await new Promise(resolve => setTimeout(resolve, 7000));
    console.log('Test completed successfully.');
    
  } catch (err: any) {
    console.error('Failed to run test:', err.message);
    console.error(err);
  }
  process.exit(0);
}

testEmailAndNotification();
