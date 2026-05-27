import { db } from '../src/db/index.js';
import { tickets, notifications } from '../src/db/schema/index.js';
import { eq } from 'drizzle-orm';

async function run() {
  try {
    console.log('Querying all tickets...');
    const allTickets = await db.query.tickets.findMany();
    console.log(`Found ${allTickets.length} tickets:`);
    for (const t of allTickets) {
      console.log(`- Ticket ID ${t.ticketId} (${t.ticketCode}): Title: "${t.title}", AssignedToUserId: ${t.assignedToUserId}, Status: ${t.status}`);
    }

    console.log('\nQuerying all notifications...');
    const allNotifs = await db.query.notifications.findMany();
    console.log(`Found ${allNotifs.length} notifications:`);
    for (const n of allNotifs) {
      console.log(`- Notif ID ${n.notificationId}: Title: "${n.title}", Target User ID: ${n.userId}, Type: ${n.type}`);
    }
  } catch (err: any) {
    console.error('Error:', err.message);
  }
  process.exit(0);
}

run();
