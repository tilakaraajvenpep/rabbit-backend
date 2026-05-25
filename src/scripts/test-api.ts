import 'dotenv/config';
import { TicketService } from '../modules/ticket/ticket.service.js';

async function main() {
  try {
    // Let's test getTickets with a specific projectId (e.g., 6) and role 'TeamLead'
    const tix = await TicketService.getTickets({
      tenantId: 1,
      projectId: 6,
      userId: 5, // Simulating a team lead userId
      role: 'TeamLead'
    });
    console.log('Result for Project 6, TeamLead:', tix);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    process.exit(0);
  }
}

main();
