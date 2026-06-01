import { db } from '../db/index.js';
import { users, projects, tickets, dailyReportItems } from '../db/schema/index.js';
import { eq } from 'drizzle-orm';

async function run() {
  const allUsers = await db.select().from(users);
  console.log("All Users:", allUsers.map(u => ({ userId: u.userId, fullName: u.fullName, email: u.email })));
  const testingUser = allUsers.find(u => (u.fullName || '').toLowerCase().includes('testing') || (u.email || '').toLowerCase().includes('testing'));
  
  if (!testingUser) {
    console.log("Testing user not found!");
    process.exit(0);
  }
  
  console.log("Testing User:", {
    userId: testingUser.userId,
    fullName: testingUser.fullName,
    email: testingUser.email,
    role: testingUser.role,
    isActive: testingUser.isActive
  });

  const allProjects = await db.select().from(projects);
  console.log("\nAll Projects with Allocations:");
  for (const proj of allProjects) {
    const allocations = proj.employeeAllocatedHours;
    if (allocations && allocations[testingUser.userId]) {
      console.log(`- Project: ${proj.projectName} (ID: ${proj.projectId})`);
      console.log(`  TotalHours (db): ${proj.totalHours}`);
      console.log(`  ApprovedHours: ${proj.approvedHours}`);
      console.log(`  Allocated Hours to Testing: ${allocations[testingUser.userId]}`);
      
      // Get tickets assigned to testing on this project
      const projTickets = await db.select().from(tickets).where(eq(tickets.projectId, proj.projectId));
      const testingTickets = projTickets.filter(t => t.assignedToUserId === testingUser.userId);
      console.log(`  Tickets assigned to testing:`);
      for (const t of testingTickets) {
        // Get consumed hours for this ticket
        const items = await db.select().from(dailyReportItems).where(eq(dailyReportItems.ticketId, t.ticketId));
        const consumed = items.reduce((s, item) => s + parseFloat(item.hoursSpent), 0);
        console.log(`    * Ticket: ${t.title} (ID: ${t.ticketId}, Status: ${t.status}, consumed: ${consumed} hrs)`);
      }
    }
  }
  
  process.exit(0);
}

run().catch(console.error);
