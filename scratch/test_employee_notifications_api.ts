import axios from 'axios';
import { db } from '../src/db/index.js';
import { notifications } from '../src/db/schema/notifications.js';
import { eq } from 'drizzle-orm';

async function run() {
  try {
    const employeeUserId = 31;
    const tenantId = 2;

    // 1. Create a test notification for Employee (user ID 31) if none exist
    console.log('Checking existing notifications for employee (ID: 31)...');
    const existing = await db.query.notifications.findFirst({
      where: eq(notifications.userId, employeeUserId)
    });

    if (!existing) {
      console.log('No notifications found. Inserting a test notification...');
      await db.insert(notifications).values({
        tenantId,
        userId: employeeUserId,
        title: 'Test Notification for Employee',
        message: 'This is a test notification to verify API delivery.',
        type: 'ticket',
        isRead: false,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      console.log('Test notification inserted successfully.');
    } else {
      console.log('Existing notification found:', existing.title);
    }

    // 2. Perform Login to obtain JWT
    console.log('Logging in as emp@venpep.com...');
    const loginRes = await axios.post('https://rabbit-backend-p765.onrender.com/api/auth/login', {
      email: 'emp@venpep.com',
      password: 'rabbit123',
      tenantCode: 'venpep'
    });

    const token = loginRes.data.data.accessToken;
    console.log('Login successful. Token acquired.');

    // 3. Fetch notifications via API
    console.log('Fetching notifications via GET /api/notifications...');
    const notifRes = await axios.get('https://rabbit-backend-p765.onrender.com/api/notifications', {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log('API Response status:', notifRes.status);
    console.log('API Response body:', JSON.stringify(notifRes.data, null, 2));

  } catch (err: any) {
    console.error('Error during API test:', err.response?.data || err.message);
  }
  process.exit(0);
}

run();
