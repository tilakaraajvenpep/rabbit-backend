import 'dotenv/config';
import { ReportService } from './src/modules/report/report.service.js';
import { db } from './src/db/index.js';
import { users, tickets } from './src/db/schema/index.js';

async function run() {
  try {
    console.log('--- FETCHING MOCK USER & TICKET ---');
    const user = await db.query.users.findFirst();
    if (!user) {
      console.error('No users found in database. Run seed first.');
      process.exit(1);
    }
    console.log(`User: ${user.fullName} (ID: ${user.userId}, Tenant: ${user.tenantId})`);

    const ticket = await db.query.tickets.findFirst();
    if (!ticket) {
      console.error('No tickets found in database. Run seed first.');
      process.exit(1);
    }
    console.log(`Ticket: ${ticket.title} (ID: ${ticket.ticketId})`);

    console.log('\n--- TESTING submitDailyReport ---');
    const payload = {
      tenantId: user.tenantId,
      userId: user.userId,
      data: {
        reportDate: '2026-05-29',
        items: [
          {
            ticketId: ticket.ticketId,
            hoursSpent: 4.5,
            workDone: 'Testing submit EOD report locally.'
          }
        ]
      }
    };

    const result = await ReportService.submitDailyReport(payload);
    console.log('✅ Success! Result:', result);
  } catch (error: any) {
    console.error('❌ FAILED with error:', error);
    if (error.stack) {
      console.error(error.stack);
    }
  }
  process.exit(0);
}

run();
