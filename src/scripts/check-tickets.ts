import 'dotenv/config';
import { db } from '../db/index.js';
import { tickets, projects } from '../db/schema/index.js';
import { eq } from 'drizzle-orm';

async function main() {
  try {
    console.log('--- PROJECTS ---');
    const allProj = await db.select({
      id: projects.projectId,
      name: projects.projectName,
      status: projects.status,
      assignedTeamLeadId: projects.assignedTeamLeadId,
      tenantId: projects.tenantId
    }).from(projects);
    console.table(allProj);

    console.log('\n--- TICKETS ---');
    const allTix = await db.select({
      id: tickets.ticketId,
      projectId: tickets.projectId,
      title: tickets.title,
      isDeleted: tickets.isDeleted,
      assignedToUserId: tickets.assignedToUserId,
      tenantId: tickets.tenantId
    }).from(tickets);
    console.table(allTix);

  } catch (err) {
    console.error('Error querying DB:', err);
  } finally {
    process.exit(0);
  }
}

main();
